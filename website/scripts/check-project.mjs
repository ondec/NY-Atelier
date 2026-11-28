import { existsSync, readFileSync } from 'node:fs';
const files=['src/App.jsx','src/main.jsx','src/catalog.js','src/styles.css','index.html','package.json','vite.config.js'];
for(const file of files){if(!existsSync(file)) throw new Error('Missing file: '+file);}
const app=readFileSync('src/App.jsx','utf8');
const navItems = app.match(/const navItems = (\[[^\n]+);/);
if (!navItems) throw new Error('Missing top navigation');
const topNav = [...navItems[1].matchAll(/\['([^']+)',\s*'([^']+)'\]/g)].map(([, label, path]) => [label, path]);
const expected = [['Services', '/services'], ['RTW Store', '/rtw-store'], ['Appointment', '/appointment'], ['Contact', '/contact']];
if (JSON.stringify(topNav) !== JSON.stringify(expected)) throw new Error('Unexpected top navigation');
for(const nav of ['Home','Our Story']) if(!app.includes(`>${nav}</Link>`)) throw new Error('Missing footer link '+nav);
if(app.includes("['Collections', '/collections']")||app.includes("['Appointments', '/appointments']")) throw new Error('Invalid top-level navigation');
console.log('NY Atelier structure and navigation checks passed');
