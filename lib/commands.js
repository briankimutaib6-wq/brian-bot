'use strict';

const categoryData = [
  ['owner','Owner Panel','👑','owner',40],
  ['main','Main Panel','🛠️','main',40],
  ['downloads','Downloads','📥','download',40],
  ['group','Group Tools','👥','group',40],
  ['vpn','VPN Panel','🔥','vpn',40],
  ['book','Book Panel','📖','book',40]
];

const categories = categoryData.map(([key,title,icon,prefix,count]) => ({ key,title,icon,prefix,count,commands: [] }));

for (let i = 0; i < 1000; i += 1) {
  categories.forEach(category => {
    const suffix = String(i + 1).padStart(4, '0');
    category.commands.push(`${category.prefix}${suffix}`);
  });
}

const lookup = new Map();
for (const category of categories) {
  for (let i = 0; i < category.commands.length; i += 1) lookup.set(category.commands[i], category);
}

function getResponse(command) {
  const category = lookup.get(command);
  if (!category) return null;
  return `${category.icon} ${category.title} command executed successfully.`;
}

function getCommand(categoryKey,number) {
  const category = categories.find(item => item.key === categoryKey);
  return category?.commands[Number(number) - 1] || null;
}

function list(categoryKey,page=1,pageSize=20) {
  const category = categories.find(item => item.key === categoryKey);
  if (!category) return {page:1,pages:1,names:[],commands:[]};
  const pages = Math.ceil(category.count * 1000 / pageSize);
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1,page),pages) : 1;
  const start = (safePage - 1) * pageSize;
  const names=[];
  const commands=[];
  for (let offset=0; offset<Math.min(pageSize,category.commands.length-start); offset+=1) {
    names.push(category.commands[start+offset]);
    commands.push(category.commands[start+offset]);
  }
  return {page:safePage,pages,names,commands};
}

module.exports = { categories, count: lookup.size, getResponse, getCommand, list };
