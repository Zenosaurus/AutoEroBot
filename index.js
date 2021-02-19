let e621 = require('e621-api').default;
let wrapper = new e621('Node-js-1.0', null, null, 1);

const Discord = require('discord.js');
const client = new Discord.Client();

let fs = require('fs');

let subs = { "0":[] };

const checkTimer = 12000;
let doneInSec = 0; // if > 0 sleep 1s  // E621/E926 have a hard rate limit of two requests per second.

function isdef(e) { return typeof(e) !== "undefined"; }

let guild = null;

function postCheck(ch, s, i) { // channel, search
	if(subs["0"].length > 0)
	wrapper.posts.getIndexPaginate(s, 1, 1, 1)
		.then((results) => {
			//console.log(results[0][0].file_url);
			//console.log(results[0][0]);
			if(results.length > 0 && results[0].length > 0 && subs["0"].length > i && subs["0"][i]["channel"] == ch)
			if(subs["0"][i]["last"] < results[0][0].id) {
			  	console.log("NEW "+results[0][0].id);
				let sp = results[0][0].file_url.split('/');
				guild.channels.find(v => v.id == ch).send(`<https://e621.net/post/show/${results[0][0].id}>`, {files: [
					{
						attachment:results[0][0].file_url, name:sp[sp.length-1]
					}
				]});
				subs["0"][i]["last"] = results[0][0].id;
			}
		})
}

function hasRoles(msg, roleids, callback) {
	msg.guild.fetchMember(msg.member.id).then((m)=> {
		console.log("Checking "+m.displayName)
		m.roles.forEach((r) => {
			console.log(r.id + " " + roleids.indexOf(r.id));
			if(roleids.indexOf(r.id) > -1) {
				callback(msg);
				return;
			}
		});
	});
}

function getSubTags(chan) {
	let out = [];
	for(let i = 0; i < subs["0"].length; i++) {
		if(subs["0"][i]["channel"] == chan)
			out.push(subs["0"][i]["term"]);
	}
	return out;
}

function cmds(msg) {
	if (isdef(msg.guild) && msg.content.startsWith('::subscribe ') || msg.content.startsWith("::sub ")) {
		let cmd = msg.content.split(' ')[0];
		let args = msg.content.slice(cmd.length, msg.content.length).trim();
		let tags = getSubTags(msg.channel.id);
		if(tags.indexOf(args) < 0) {
			subs["0"].push({"channel":msg.channel.id, "term":args, "last":0});

			fs.writeFile("subs.json", JSON.stringify(subs), function(err) {
				 if (err) {
					  console.log(err);
				 }
			});

			msg.channel.send(`**#${msg.channel.name}** is now subscribed to \`${args}\`.`);
		} else {
			msg.channel.send(`**#${msg.channel.name}** is already subscribed to \`${args}\`.`);
		}

	} else if (isdef(msg.guild) && msg.content.startsWith('::unsubscribe ') || msg.content.startsWith("::unsub ")) {
		let cmd = msg.content.split(' ')[0];
		let args = msg.content.slice(cmd.length, msg.content.length).trim();
		let ind = -1;
		for(let i = 0; i < subs["0"].length; i++) {
			if(subs["0"][i]["channel"] == msg.channel.id && subs["0"][i]["term"] == args) {
				ind = i;
				break;
			}
		}
		if(ind > -1) {
			subs["0"].splice(ind,1);

			fs.writeFile("subs.json", JSON.stringify(subs), function(err) {
				 if (err) {
					  console.log(err);
				 }
			});

			msg.channel.send(`**#${msg.channel.name}** is now unsubscribed from \`${args}\`.`);
		} else {
			msg.channel.send(`**#${msg.channel.name}** is not subscribed to \`${args}\`.`);
		}
	}
	else if(isdef(msg.guild) && msg.content.startsWith('::roleids ')) {
		let cmd = msg.content.split(' ')[0];
		let args = msg.content.slice(cmd.length, msg.content.length).trim();
		let out = "";
		msg.guild.fetchMember(args).then((m)=> {
			m.roles.forEach((r) => {
				if(r.name != "@everyone")
					out += r.name + " - " + r.id + "\n";
			});

			msg.channel.send(out);
		});
	} else if(isdef(msg.guild) && msg.content.startsWith('::save')) {

		fs.writeFile("subs.json", JSON.stringify(subs), function(err) {
			 if (err) {
				  console.log(err);
			 }
		});
		console.log("Saved");
	} else if(isdef(msg.guild) && msg.content.startsWith('::getsubs')) {
		let tags = getSubTags(msg.channel.id);
		console.log(tags);
		let out = "";
		for(let i = 0; i < tags.length; i++) {
			out += "\n"+ tags[i];
		}
		msg.channel.send(`\`\`\`${out}\`\`\``);
	} else if(msg.content.startsWith("::test")) {
		let spl = mention2text(msg).split(' ');
		spl.shift();
		msg.channel.send(spl.join(' '));
	}
}

function mention2text(msg) {
	let out = msg.content;
	if(msg.mentions.users.array().length > 0) {
		msg.mentions.users.array().forEach((item)=>{
			out = out.split(`<@${item.id}>`).join(item.username+'#'+item.discriminator);
		});
	}
	if(msg.mentions.roles.array().length > 0) {
		msg.mentions.roles.array().forEach((item)=>{
			out = out.split(`<@&${item.id}>`).join(item.name);
		});
	}
	if(msg.mentions.channels.array().length > 0) {
		msg.mentions.channels.array().forEach((item)=>{
			out = out.split(`<#${item.id}>`).join('#'+item.name);
		});
	}
	return out;
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	guild = client.guilds.find(g => g.id == "496871589992857603");
});

client.on('message', msg => {
	if(!msg.author.bot && isdef(msg.guild) && msg.guild !== null && msg.content.startsWith("::"))
		hasRoles(msg, ['496874822475972611','496874826590453763','496874997327855628'], cmds)

});
client.on('error', console.error);

try {
	subs = JSON.parse(fs.readFileSync("subs.json"));
} catch(e) {
	console.log("No subs.json found! Continuing...");
}

//setInterval(()=>{ doneInSec = 0; }, 1000);
let a = 0;
setInterval(()=>{
	if(subs["0"].length > 0)
	if(a >= subs["0"].length) {
		a = 0;
 		postCheck(subs["0"][a]["channel"], subs["0"][a]["term"], a);
 		a++;
	}
	else {
		postCheck(subs["0"][a]["channel"], subs["0"][a]["term"], a);
		a++;
	}
}, 1212);

setInterval(()=>{

	// Save data
	fs.writeFile("subs.json", JSON.stringify(subs), function(err) {
		 if (err) {
			  console.log(err);
		 }
	});
	console.log("Saved subs.json");
}, 60000*16)

client.login('key');
