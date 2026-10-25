const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{execFileSync}=require('node:child_process');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const source=fs.readFileSync('js/sigma-conversations.js','utf8');
 for(const width of [1440,375])for(const userId of ['101','202']){
  const page=await browser.newPage({viewport:{width,height:800}});
  await page.route('http://chat.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="sigmaAiPanel"><header class="sigma-ai-header"></header><div id="sigmaAiMessages"></div><div><div id="sigmaAiComposer"><input id="sigmaAiInput"><button id="sigmaAiSendBtn">Send</button></div></div></div>'}));await page.goto('http://chat.test');
  await page.evaluate(userId=>{
   sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:userId}));window.failHistory=false;
   window.SigmaDatabase={request:async(name,options)=>{await new Promise(r=>setTimeout(r,150));if(window.failHistory)throw Error('Offline');if(options?.data)return {success:true};return {success:true,conversations:[{id:'saved-chat-'+userId,title:'Saved conversation '+userId,updatedAt:1792800000000,messages:[{role:'user',text:'My saved question'},{role:'assistant',text:'My saved answer'}]}],deletedIds:[]};}};
   window.SigmaMessageFormat={raw:e=>e.textContent};window.renderSigmaEmptyState=()=>'<p>No conversations yet</p>';
   window.renderSigmaChatMessage=item=>{const e=document.createElement('div');e.className='sigma-ai-message'+(item.role==='user'?' sigma-ai-message--user':'');const b=document.createElement('div');b.className='sigma-ai-message__bubble';b.textContent=item.text;e.append(b);return e;};
  },userId);
  await page.addScriptTag({content:source});await page.getByRole('button',{name:'Past conversations',exact:true}).click();assert.equal(await page.getByText('No conversations yet').count(),0);await page.locator('.sigma-conversation-item').waitFor();assert.equal(await page.locator('.sigma-conversation-title').textContent(),'Saved conversation '+userId);assert.equal(await page.locator('.sigma-conversation-item').count(),1);
  await page.locator('.sigma-conversation-item').click();assert.equal(await page.locator('.sigma-ai-message').count(),2);assert.equal(await page.locator('.sigma-ai-message__bubble').last().textContent(),'My saved answer');
  await page.evaluate(()=>{window.failHistory=true;});await page.getByRole('button',{name:'Past conversations',exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.locator('.sigma-conversation-item').count(),1,'A failed reload must preserve existing history');await page.close();
 }
 const php=`require 'php/includes/chat_conversations.php'; $rows=[['id'=>'a','conversationId'=>'chat','prompt'=>'First','response'=>'Reply','timestamp'=>'2026-10-24T00:00:00Z'],['id'=>'b','conversationId'=>'chat','prompt'=>'Second','response'=>'Another reply','timestamp'=>'2026-10-25T00:00:00Z','messages'=>[['role'=>'user','text'=>'First'],['role'=>'assistant','text'=>'Reply']]],['id'=>'old','prompt'=>'Older question','response'=>'Older answer','timestamp'=>'2026-10-20T00:00:00Z']]; echo json_encode(sigmaConversationHistory($rows));`;
 const chats=JSON.parse(execFileSync('C:/xampp/php/php.exe',['-r',php],{encoding:'utf8'}));assert.equal(chats.length,2);assert.equal(chats[0].messages.length,4);assert.equal(chats[0].messages[2].text,'Second');assert(chats[1].id.startsWith('request-'));
 console.log('PASS database history on clean desktop/mobile browsers for separate accounts; saved transcript opens; failed refresh preserves history; original exchanges ordered without cumulative-message duplicates.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
