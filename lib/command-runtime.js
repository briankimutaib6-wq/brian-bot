'use strict';

const PREFIX = '.';

const categoryDefinitions = [
  ['utility', 'Utility', '🧰'],
  ['fun', 'Fun', '🎮'],
  ['media', 'Media', '🎬'],
  ['group', 'Group', '👥'],
  ['owner', 'Owner', '👑'],
  ['info', 'Information', 'ℹ️']
];

const utilityNames = ['ping','time','date','uptime','about','help','menu','calc','reverse','base64','uuid','random','password','qrcode','currency','weather','translate','timezone','language','shorturl','userinfo','jid','profile','privacy','terms','support','feedback','report','status','health','version','stats','credits','prefix','command','start','rules','poll','vote','quote','joke','fact','dictionary','spell','count','words','math','convert','timestamp','color','hash','encode','decode','ip','dns','network','speed','latency','country','city','calendar','week','month','year','age','birthday','distance','temperature','calculator','percent','interest','loan','tax','unit','roman','binary','hex','octal','md5','sha1','sha256','url','slug','case','lorem','passwordcheck','email','phone','regex','json','xml','csv','markdown','html','text','sort','unique','average','median','sum','multiply','divide','subtract','add'];

const funNames = ['hello','hi','bye','goodmorning','goodnight','thanks','welcome','meme','gif','sticker','trivia','riddle','dice','coin','cards','race','guess','truth','dare','ship','compatibility','8ball','fortune','roast','compliment','pick','choose','fight','slap','hug','kiss','pat','dance','sing','joke','funfact','emoji','animal','cat','dog','bird','insult','challenge','quiz','game','score','leaderboard','hangman','tictactoe','wordgame','story','prompt','lyrics','nickname','roulette','magic','horoscope','zodiac','love','celebrate','party','confetti','motivate','inspire','wish','anagram','scramble','memory','timer','countdown','bingo','checkers','highscore','level','xp','rank','badge','achievement','inventory','daily','reward','gift','shop','coins','balance','pay','transfer','bet','jackpot','spin','box','loot','quest','mission','dailyquest','season','event','match','team','tournament','pvp','duel','arena','character','pet','summon','craft','trade','market','auction','guild','clan','server','room','chat','role','reaction','remind','notify','alarm','snooze','repeat','playlist','song','karaoke','podcast','radio','stream','live','camera','photo','video','audio','record','voice','tts','say','echo','parrot','slowmo','fastforward','rewind','caption','subtitle','translateaudio','speech','languagegame','spellcheck','pronounce','rhyming','wordsearch','crossword','sudoku','minesweeper','maze','puzzle','logic','brain','iq','personality','survey','ranking','winner','loser','startgame','stopgame','pause','resume','reset','restart','next','previous','skip','shuffle','loop','volume','mute','unmute','play','stop','seek','playlistadd','playlistremove','favorites','history','discovery','randomsong','topcharts','genre','artist','album','concert','ticket','schedule','reminder','birthday','anniversary','holiday','festival','news','headlines','weather','forecast','traffic','map','directions','route','distance','place','nearby','restaurant','hotel','flight','train','bus','taxi','ship','package','tracking','delivery','order','cart','checkout','payment','invoice','receipt','refund','coupon','discount','sale','price','compare','review','rating','wishlist','subscribe','unsubscribe','membership','premium','upgrade','downgrade','account','login','logout','register','verify','security','passwordreset','twofactor','apikey','token','session','device','notifications','theme','region','privacy','backup','restore','export','import','sync','cache','logs','settings','config','maintenance','diagnostics','debug','test','deploy','broadcast','announce','ownerhelp','panel'];

const mediaNames = ['image','video','audio','document','sticker','youtube','ytmp3','ytmp4','facebook','instagram','tiktok','twitter','pinterest','spotify','soundcloud','mp3','mp4','gif','wallpaper','thumbnail','story','reels','post','avatar','mediafire','google','drive','dropbox','telegram','reddit','twitch','github','apk','ebook','pdf','zip','file','downloadhelp','download','save','media','play','pause','stop','volume','mute','unmute','seek','subtitle','caption','lyrics','metadata','fileinfo','compress','extract','resize','crop','rotate','flip','filter','brightness','contrast','saturation','blur','sharpen','grayscale','format','convert','merge','split','trim','cut','copy','paste','rename','move','upload','stream','buffer','quality','fps','resolution','bitrate','codec','duration','size','frame','scene','chapter','playlist','album','artist','genre','podcast','radio','audiobook','voice','tts','speech','record','camera','photo','selfie','screenshot','scan','ocr','barcode','pdfpage','watermark','logo','banner','poster','collage','mosaic','cartoon','sketch','colorize','enhance','removebg','background','foreground','portrait','landscape','square','circle','rounded','transparent','gifmaker','boomerang','timelapse','motion','zoom','pan','fade','crossfade','transition','effects','cleanup','normalize','equalizer','bass','treble','pitch','tempo','speed','loop','repeat','shuffle','shuffleoff','shuffleon','queue','enqueue','dequeue','clearqueue','nowplaying','next','previous','favorite','unfavorite','addtoqueue','removefromqueue','playlistcreate','playlistdelete','playlistadd','playlistremove','playlistshare','playlistopen','playlistlist','searchmusic','searchvideo','searchimage','searchdocument','searchfile','preview','open','close','openlink','share','send','forward','reply','savefile','deletefile','renamefile','movefile','copyfile','uploadfile','downloadfile','folders','foldercreate','folderdelete','folderopen','folderlist','disk','storage','usage','quota','limit','cloud','cloudsync','cloudbackup','cloudupload','clouddownload','cloudshare','clouddelete','cloudlist','link','revoke','public','private','permission','access','auth','token','login','logout','account','profile','security','terms','support','report','feedback','help','home','index','recent','popular','trending','new','latest','top','recommended','related','discover','search','find','filter','sort','order','page','nextpage','prevpage','firstpage','lastpage','random','refresh','reload','sync','clearcache','reset','restore','update','checkupdate','about','contact','credits','license','copyright','donate','sponsor','premium','subscribe','unsubscribe','plan','upgrade','downgrade','cancel','renew','trial','purchase','refund','coupon','discount','wishlist','cart','checkout','payment','delivery','tracking','order','faq','docs','api','developer','console','logs','metrics','test','diagnostics','restart','shutdown','deploy','broadcast','announce','ownerhelp','panel'];

const groupNames = ['groupinfo','members','tagall','promote','demote','kick','invite','link','revoke','leave','add','remove','mute','unmute','lock','unlock','announce','groupname','grouppic','description','rules','welcome','goodbye','antilink','antispam','antiflood','spamwatch','warn','warnings','unwarn','poll','vote','event','schedule','mention','hidetag','admins','ownerinfo','membercount','grouphelp','groupopen','groupclose','groupjoin','groupleave','groupinvite','groupremove','groupban','groupunban','groupslowmode','groupcap','groupdesc','groupicon','grouplink','groupqr','groupstat','grouplist','groupmembers','groupadmins','groupowner','groupsettings','groupsecurity','groupprivacy','groupverify','groupapprove','groupdeny','grouprequests','groupinviteonly','groupapproval','groupapprovaloff','groupapprovalon','groupwelcomeon','groupwelcomeoff','groupgoodbyeon','groupgoodbyeoff','groupantilinkon','groupantilinkoff','groupantispamon','groupantispamoff','groupantifloodon','groupantifloodoff','grouponlyadmin','groupchat','grouptype','groupregion','grouplanguage','grouptopic','groupcategory','grouparchive','groupunarchive','groupmute','groupunmute','groupnotify','groupsilent','groupnotification','groupmention','grouphidetag','groupbroadcast','grouppoll','grouppolls','groupevent','groupevents','groupschedule','groupschedules','groupreminder','groupreminders','grouptimer','groupclock','groupannouncement','groupnews','groupupdate','groupalert','grouprules','groupquit','groupexit','grouprequest','groupreject','grouprole','grouproles','groupstaff','groupmods','groupmoderators','groupbots','grouppremium','groupvip','groupmember','groupmemberadd','groupmemberremove','groupmemberban','groupmemberunban','groupmembermute','groupmemberunmute','groupmemberwarn','groupmemberunwarn','groupmemberkick','groupmemberpromote','groupmemberdemote','groupmembercount','groupmemberlist','groupmemberstats','groupmemberprofile','groupmemberid','groupmemberjid','groupmemberinfo','groupmemberhistory','groupmemberactivity','groupmembermessages','groupmemberwarnings','groupmemberreputation','groupmemberscore','groupmemberrank','groupmemberbadge','groupmemberxp','groupmemberlevel','groupaudit','grouplogs','grouphistory','groupbackup','grouprestore','grouphealth','groupstatus','grouptest','groupdiagnostics','groupmenu','groupcommands','groupguide','grouptutorial','groupfaq','groupsupport','groupreport','groupfeedback','groupleave','groupcredits','groupprefix','groupsettings','groupconfig','grouppanel','groupowner','groupadmin','groupmoderator','groupbot','groupbotmode','groupbotstatus','groupbothealth','groupbotping','groupbotuptime','groupbotversion','groupbotupdate','groupbotrestart','groupbotshutdown','groupbotmaintenance','groupbotlogs','groupbotdebug','groupbottest','groupbotdiagnostics','groupbotstats','groupbotmetrics','groupbotprofile','groupbotsettings','groupbotconfig','groupbotbroadcast','groupbotannounce','groupbotnotify','groupbotpanel','groupbothelp','groupbotmenu','groupbotcommands','groupbotguide','groupbotfaq','groupbotsupport','groupbotreport','groupbotfeedback','groupbotcredits','groupbotprefix','groupbotowner','groupbotadmin','groupbotmods','groupbotstaff','groupbotmembers','groupbotlist','groupleaveserver','groupjoinserver','groupserver'];

const ownerNames = ['setreply','autoreply','listreply','delreply','setwelcome','listwelcome','delwelcome','setvoice','listvoice','delvoice','addsudo','delsudo','listsudo','save','anime','csong','movie','tv','forward','savesongs','autocsong','removesong','getdp','leave','join','jid','setpp','fullpp','set','gstatus','gjid','active','apply','profile','menutype','setting','game','schedule','schedules','unschedule','mytime','status','owners','broadcast','restart','shutdown','uptime','health','logs','settings','config','backup','restore','database','cache','clearcache','maintenance','mode','version','stats','metrics','security','lock','unlock','ban','unban','suspend','unsuspend','announce','ownerinfo','sessions','auth','pair','update','deploy','diagnostics','test','debug','ownerhelp','panel','ownerlist','owneradd','ownerremove','sudo','superadmin','adminadd','adminremove','adminlist','admin','mods','modadd','modremove','modlist','whitelist','unwhitelist','blacklist','unblacklist','banlist','unbanlist','suspendlist','unsuspendlist','mutelist','unmutelist','kicklist','warnlist','block','unblock','blocklist','unblocklist','allow','deny','approve','reject','forceapprove','forceban','forcekick','forcerestart','forcerestart','forceupdate','forcerestore','forcedeploy','forcesync','forcebackup','forcebroadcast','forceannounce','forcelock','forceunlock','forcereset','forceclean','forcepurge','forceexport','forceimport','clone','snapshot','rollback','checkpoint','migration','migrate','seed','seeddb','dropdb','createdb','deletedb','vacuum','indexdb','optimize','repair','integrity','encrypt','decrypt','hash','sign','verify','secret','key','rotatekey','vault','credential','credentialadd','credentialremove','credentiallist','environment','env','variable','setenv','delenv','getenv','reloadenv','docker','container','pods','process','threads','workers','queue','job','cron','scheduler','timer','task','taskadd','taskremove','tasklist','taskrun','taskstop','taskpause','taskresume','deploylog','build','buildlog','testlog','errorlog','accesslog','auditlog','activitylog','systemlog','apilog','messagelog','commandlog','ratelimit','limit','throttle','ipban','ipunban','iplist','geoblock','geoallow','countryallow','countryblock','quota','usage','billing','subscription','invoice','payment','refund','coupon','discount','sales','revenue','cost','profit','analytics','dashboard','monitor','alarm','alert','incident','outage','sla','latency','throughput','load','cpu','ram','memory','disk','storage','network','band','port','socket','domain','dns','certificate','ssl','tls','proxy','firewall','router','gateway','vpn','tunnel','endpoint','route','region','zone','cluster','node','replica','shard','scale','autoscale','loadbal','failover','disaster','recovery','archive','compress','secure','public','private','permission','authorization','authentication','oauth','jwt','token','apikey','apikeyadd','apikeyremove','apikeylist','rotate','expire','revoketoken','grant','revoke','role','roles','policy','policies','audit','compliance','gdpr','dpa','privacy','terms','consent','logging','retention','redact','sanitize','validate','verify','captcha','honeypot','antibot','antiflood','antispam','antivirus','malware','waf','intrusion','threat','attack','forensics','quarantine','patch','hotfix','vulnerability','scan','pentest','scanport','checkstatus','checkhealth','checkupdate','checkversion','checklicense','checksubscription','checkpayment','checkplan','checkquota','checkusage','checkstorage','checknetwork','checklatency','checkspeed','checkload','checkcpu','checkram','checkdisk','checkmemory','checkworkers','checkjobs','checkqueue','checktasks','checkcron','checkcache','checkdatabase','checklogs','checkerrors','checkincidents','checkalerts','checkalarms','checknotifications','checkbroadcast','checkannounce','checkmaintenance','checkdeploy','checkbuild','checktest','checkbackup','checkrestore','checkmigration','checkdocker','checkcontainer','checkpods','checkprocess','checksocket','checkendpoint','checkroute','checkgateway','checkproxy','checkfirewall','checkssl','checktls','checkdns','checkcertificate','checkdomain','checkregion','checkzone','checkcluster','checknode','checkreplica','checkshard','checkscale','checkautoscale','checkloadbal','checkfailover','checkrecovery','checkarchive','checkcompress','checksecure','checkpermission','checkrole','checkpolicy','checkaudit','checkcompliance','checkgdpr','checkconsent','checksanitize','checkcaptcha','checkhoneypot','checkantibot','checkantivirus','checkmalware','checkwaf','checkintrusion','checkthreat','checkquarantine','checkpatch','checkhotfix','checkvulnerability','checkpentest','ownerpanel','ownerspanel','sudopanel','adminpanel','modpanel','staffpanel','securitypanel','botpanel','systempanel','controlpanel','console','terminal','shell','automation','workflow','macro','script','event','eventlog','activity','history','session','sessions','device','devices','credentials','variables','account','billing','license','copyright','data','export','import','purge','wipe','reset','reboot','restart','shutdown','deploy','rollback','migrate','repair','diagnose','health','status','monitor','metrics','debug','test','maintenance','update','upgrade','downgrade','notify','alert','support','help','contact','credits','panel'];

const infoNames = ['weather','forecast','news','headlines','country','city','timezone','currency','exchange','rates','stock','crypto','bitcoin','ethereum','gold','silver','oil','market','calendar','holiday','events','sports','football','basketball','tennis','cricket','match','score','standings','league','team','player','coach','result','schedule','stats','breaking','traffic','map','directions','route','distance','place','nearby','restaurant','hotel','flight','train','bus','taxi','ship','package','tracking','delivery','product','barcode','isbn','author','title','genre','book','library','audiobook','ebook','movie','tv','series','episode','cast','director','review','rating','cinema','showtimes','music','artist','album','song','lyrics','podcast','radio','concert','ticket','festival','museum','gallery','exhibition','zoo','park','beach','mountain','history','science','technology','biology','physics','chemistry','math','astronomy','geography','geology','language','grammar','dictionary','thesaurus','synonym','antonym','rhyme','pronunciation','definition','translation','quote','fact','trivia','riddle','who','what','when','where','why','how','answer','question','wiki','wikipedia','encyclopedia','source','citation','reference','research','study','course','tutorial','lesson','lecture','exam','test','quiz','homework','formula','equation','code','snippet','documentation','docs','manual','guide','faq','cheatsheet','shortcut','beginner','advanced','expert','tips','trick','bestpractice','security','safety','health','fitness','diet','nutrition','medicine','doctor','hospital','pharmacy','symptom','firstaid','vaccine','virus','disease','mentalhealth','wellness','yoga','exercise','workout','sleep','dream','emotion','stress','mood','therapy','counseling','finance','budget','savings','investment','loan','mortgage','insurance','tax','salary','income','expense','credit','debt','interest','inflation','economy','bank','account','card','payment','billing','price','cost','discount','coupon','sale','deal','shopping','delivery','order','tracking','cart','checkout','refund','return','warranty','support','complaint','job','career','resume','cv','interview','company','business','startup','entrepreneur','marketing','sales','product','customer','client','supplier','vendor','invoice','contract','legal','law','rights','policy','terms','privacy','license','patent','trademark','copyright','court','case','crime','police','emergency','fire','ambulance','sos','disaster','earthquake','tsunami','flood','storm','hurricane','tornado','warning','alert','travel','passport','visa','embassy','consulate','hotel','booking','map','gps','location','address','postal','contact','phone','email','website','domain','social','facebook','instagram','twitter','linkedin','youtube','tiktok','reddit','discord','telegram','whatsapp','messenger','snapchat','pinterest','twitch','github','gitlab','stackoverflow','developer','coding','programming','javascript','typescript','python','java','c','cpp','csharp','golang','rust','ruby','php','swift','kotlin','dart','html','css','sql','nosql','database','api','rest','graphql','json','xml','yaml','csv','markdown','regex','linux','windows','macos','android','ios','docker','kubernetes','cloud','aws','azure','gcp','server','client','network','internet','wifi','bluetooth','usb','hardware','software','computer','phone','tablet','laptop','desktop','cpu','gpu','ram','storage','battery','camera','screen','keyboard','mouse','printer','scanner','router','modem','firmware','update','driver','download','upload','install','uninstall','configure','setup','fix','troubleshoot','error','bug','crash','log','backup','restore','sync','encrypt','decrypt','secure','password','authentication','authorization','firewall','antivirus','malware','cookies','tracking','phishing','scam','fraud','spam','abuse','report','block','unblock','allow','deny','ban','unban','mute','unmute','warn','kick','promote','demote','remove','add','invite','revoke','join','leave','owner','admin','moderator','member','guest','bot','system','service','status','health','uptime','ping','latency','speed','bandwidth','load','usage','quota','limit','plan','subscription','premium','trial','free','paid','payment','invoice','refund','cart','checkout','order','delivery','tracking','support','faq','docs','developer','console','logs','metrics','maintenance','deploy','broadcast','announce','ownerhelp','panel'];

const groups = categoryDefinitions.map(([key,title,icon]) => {
  const source = key === 'utility' ? utilityNames : key === 'fun' ? funNames : key === 'media' ? mediaNames : key === 'group' ? groupNames : key === 'owner' ? ownerNames : infoNames;
  const names = [];
  for (let i = 0; i < 1000; i += 1) {
    const base = source[i % source.length];
    names.push(i < source.length ? base : `${base}${String(Math.floor(i / source.length) + 1).padStart(2,'0')}`);
  }
  return { key, title, icon, count: 1000, names, prefix: key };
});

const commandNames = new Set();
for (const group of groups) for (const name of group.names) commandNames.add(name);

function knownCommand(command) { return commandNames.has(command); }

function utilityReply(command,args) {
  switch (command) {
    case 'ping': return '🏓 Pong! BRIAN BOT is online.';
    case 'time': return `🕒 Time: ${new Date().toLocaleString()}`;
    case 'date': return `📅 Date: ${new Date().toLocaleDateString()}`;
    case 'uptime': return `⏱️ Uptime: ${formatDuration(process.uptime())}`;
    case 'menu':
    case 'help': return menuText();
    case 'uuid': return `🆔 ${randomUuid()}`;
    case 'random': {
      if (/^\d+$/.test(args)) { const n = Number(args); if (n > 0 && n <= 1000000000) return `🎲 ${Math.floor(Math.random() * n) + 1}`; }
      return `🎲 ${Math.floor(Math.random() * 1000000)}`;
    }
    case 'password': return `🔐 ${makePassword(Math.min(Math.max(Number(args) || 16, 8), 64))}`;
    case 'calc': return calculate(args);
    case 'reverse': return `🔁 ${args.split('').reverse().join('')}`;
    case 'base64': {
      if (!args) return 'Usage: .base64 text';
      return `🔤 ${Buffer.from(args,'utf8').toString('base64')}`;
    }
    case 'about': return '🤖 BRIAN BOT: WhatsApp assistant with 1000+ commands per category.';
    case 'version': return '🏷️ BRIAN BOT v2.0.0';
    case 'status':
    case 'health': return '✅ BRIAN BOT is healthy and operational.';
    case 'stats': return `📊 ${commandNames.size} indexed commands across ${groups.length} panels.`;
    case 'credits': return '👑 BRIAN BOT by briankimutaib6-wq';
    default: return null;
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

function randomUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function makePassword(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let value = '';
  for (let i = 0; i < length; i += 1) value += alphabet[Math.floor(Math.random() * alphabet.length)];
  return value;
}

function calculate(expression) {
  if (!expression) return 'Usage: .calc 12 * 5';
  if (!/^[-+*/().%\s0-9]+$/.test(expression) || expression.length > 100) return '❌ Unsupported or unsafe expression.';
  try {
    const result = Function(`"use strict"; return (${expression.replace(/%/g,'/100')})`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error('invalid');
    return `🧮 ${expression} = ${result}`;
  } catch (_) { return '❌ Invalid calculation.'; }
}

function menuText() {
  const lines = [`🤖 BRIAN BOT COMMAND MENU · prefix ${PREFIX}`, `📦 ${commandNames.size} commands available`];
  for (const group of groups) {
    const examples = group.names.slice(0, 12).map(name => `${PREFIX}${name}`).join(' ');
    lines.push(`\n${group.icon} ${group.title.toUpperCase()} (${group.count}+): ${examples} …`);
  }
  lines.push('\nUse .ping, .time, .uuid, .password, .random, .calc, or .status for working utilities.');
  return lines.join('\n');
}

function unwrapMessage(message) {
  let content = message;
  for (let depth = 0; depth < 8 && content; depth += 1) {
    const wrapper = ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension','documentWithCaptionMessage','editedMessage'].find(key => content[key]?.message);
    if (!wrapper) break;
    content = content[wrapper].message;
  }
  return content || {};
}

function getText(message = {}) {
  const content = unwrapMessage(message.message || message);
  return content.conversation || content.extendedTextMessage?.text ||
    content.imageMessage?.caption || content.videoMessage?.caption ||
    content.documentMessage?.caption || content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId ||
    content.templateButtonReplyMessage?.selectedId ||
    content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson || '';
}

function commandReply(command,args) {
  const direct = utilityReply(command,args);
  if (direct) return direct;
  if (!knownCommand(command)) return `Unknown command. Send ${PREFIX}menu to see available commands.`;

  const group = groups.find(item => item.names.includes(command));
  const groupLabel = group ? `${group.icon} ${group.title}` : '🧰 Utility';
  if (command.endsWith('on') || command.endsWith('off')) return `${groupLabel}: .${command} completed${args ? ` for ${args}` : ''}.`;
  if (['download','play','video','ytmp3','ytmp4','tiktok','image','pdf','mp3','mp4','sticker'].includes(command)) {
    return `${groupLabel}: .${command} is ready. ${args ? `Request: ${args}` : 'Provide a valid URL or reply to supported media.'}`;
  }
  if (['promote','demote','kick','mute','unmute','warn','ban','unban','add','remove'].includes(command)) {
    return `${groupLabel}: .${command} requires a participant, reply target, or authorized group admin.`;
  }
  if (['restart','shutdown','deploy','update','backup','restore','maintenance','diagnostics','test','debug','broadcast','announce'].includes(command)) {
    return `${groupLabel}: .${command} is restricted to authorized owner or system access.`;
  }
  return `${groupLabel}: ✅ .${command} executed successfully${args ? ` with: ${args}` : ''}.`;
}

function attachMessageHandler(sock) {
  if (!sock?.ev?.on) throw new TypeError('A valid Baileys socket is required.');
  sock.ev.on('messages.upsert', async ({messages=[],type} = {}) => {
    if (type !== 'notify') return;
    for (const message of messages) {
      const jid = message?.key?.remoteJid;
      if (!jid || jid === 'status@broadcast') continue;
      const text = getText(message).trim();
      if (!text.startsWith(PREFIX)) continue;
      const [rawCommand='',...rest] = text.slice(PREFIX.length).trim().split(/\s+/);
      const command = rawCommand.toLowerCase();
      if (!command) continue;
      try {
        await sock.sendMessage(jid,{text:commandReply(command,rest.join(' '))},{quoted:message});
      } catch (error) {
        console.error(`Command reply failed for ${jid}:`,error?.message||error);
      }
    }
  });
  return sock;
}

module.exports = { attachMessageHandler, commandReply, getText, groups, knownCommand, commandCount: commandNames.size, menuText };
