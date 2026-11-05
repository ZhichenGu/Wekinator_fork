import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {DEFAULT_USERS_FILE,parseUsers,setAccount,setAccountEnabled} from '../server/users.mjs';

function hiddenPassword(prompt){return new Promise((resolve,reject)=>{stdout.write(prompt);let value='';stdin.setRawMode(true);stdin.resume();const finish=(error)=>{stdin.off('data',read);stdin.setRawMode(false);stdin.pause();stdout.write('\n');error?reject(error):resolve(value);};const read=chunk=>{for(const ch of chunk.toString()){if(ch==='\u0003'){finish(new Error('已取消，未保存。'));return;}if(ch==='\r'||ch==='\n'){finish();return;}if(ch==='\u007f'||ch==='\b')value=value.slice(0,-1);else if(ch>=' '&&value.length<257)value+=ch;}};stdin.on('data',read);});}
async function main(){
 if(!stdin.isTTY||!stdout.isTTY)throw new Error('请在本机终端运行 npm run users；密码不会通过命令参数传入。');
 const file=fileURLToPath(DEFAULT_USERS_FILE);const config=JSON.parse(await readFile(file,'utf8'));const users=parseUsers(config);
 console.log('\n账号列表（仅显示名称和启用状态）：');for(const u of users)console.log(`  ${u.username} · ${u.enabled?'启用':'停用'}`);
 const rl=createInterface({input:stdin,output:stdout});let option,username;try{option=(await rl.question('\n1 新建/重设密码  2 停用账号  3 启用账号  0 退出\n选择：')).trim();if(option==='0')return;if(!['1','2','3'].includes(option))throw new Error('请选择 0、1、2 或 3。');username=(await rl.question('账号：')).trim();}finally{rl.close();}
 let updated;if(option==='1'){const password=await hiddenPassword('密码（输入不显示）：');const confirm=await hiddenPassword('再次输入密码：');if(password!==confirm)throw new Error('两次密码不一致，未保存。');updated=await setAccount(config,username,password);}else updated=setAccountEnabled(config,username,option==='3');
 const temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp';try{await writeFile(temporary,JSON.stringify(updated,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(temporary,file);}finally{await unlink(temporary).catch(()=>{});}
 console.log('\n已更新 config/users.json。密码未明文保存。\n本地服务需重启；线上需提交并推送，再等待 Render 部署成功。');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
