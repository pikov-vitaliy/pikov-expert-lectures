(function(){
 var s=[].slice.call(document.querySelectorAll('.slide')),i=0,c=document.getElementById('cnt'),st=document.querySelector('.stage');
 function fitS(){var k=Math.min(st.clientWidth/1280,st.clientHeight/720)*0.97;s.forEach(function(e){e.style.transform='translate(-50%,-50%) scale('+k+')'})}
 window.addEventListener('resize',fitS);fitS();
 try{document.fonts.ready.then(function(){fitT(s[i])})}catch(e){}
 // без Calibri (телефон, Mac) текст шире: уменьшить содержимое слайда, пока оно не поместится
 function over(e,b){return b.scrollHeight>b.clientHeight+1||e.scrollHeight>e.clientHeight+1}
 function fitT(e){var b=e.querySelector('.body');if(!b||!e.offsetHeight)return;var ch=[].slice.call(b.children),z=1;ch.forEach(function(x){x.style.zoom=''});while(over(e,b)&&z>0.6){z-=0.04;ch.forEach(function(x){x.style.zoom=z})}}
 function go(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach(function(e,k){e.classList.toggle('on',k===i)});fitT(s[i]);c.textContent=(i+1)+' / '+s.length;try{history.replaceState(null,'','#'+(i+1))}catch(e){}}
 function fromHash(){var h=parseInt((location.hash||'#1').slice(1),10);go(isNaN(h)?0:h-1)}fromHash();window.addEventListener('hashchange',fromHash);
 (function(){var bk=document.getElementById('back');if(!bk)return;try{if(window.self!==window.top||window.opener)return;
  var m=location.pathname.match(/\/materials\/day-0(\d)\/slides\/[^\/]*$/);
  if(m&&/^https?:$/.test(location.protocol)){bk.href='../../../day-0'+m[1]+'.html#slides';bk.hidden=false}
  else if(document.referrer&&history.length>1){bk.href='#';bk.onclick=function(e){e.preventDefault();history.back()};bk.hidden=false}}catch(e){}})();
 document.getElementById('prev').onclick=function(){go(i-1)};document.getElementById('next').onclick=function(){go(i+1)};
 document.addEventListener('keydown',function(e){if(['ArrowRight','PageDown',' '].indexOf(e.key)>=0){e.preventDefault();go(i+1)}else if(['ArrowLeft','PageUp'].indexOf(e.key)>=0){e.preventDefault();go(i-1)}else if(e.key==='Home'){go(0)}else if(e.key==='End'){go(s.length-1)}});
 var tx0=null;st.addEventListener('touchstart',function(e){tx0=e.touches[0].clientX},{passive:true});st.addEventListener('touchend',function(e){if(tx0===null)return;var dx=e.changedTouches[0].clientX-tx0;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));tx0=null});
 var tb=document.getElementById('theme');function cur(){return document.documentElement.getAttribute('data-theme')}
 function icon(){tb.textContent=cur()==='dark'?'☀':'☾'}icon();
 tb.onclick=function(){var t=cur()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',t);var d=new Date(),x=new Date(d);var hh=d.getHours();if(hh>=7&&hh<20){x.setHours(20,0,0,0)}else{if(hh>=20){x.setDate(x.getDate()+1)}x.setHours(7,0,0,0)}try{localStorage.setItem('deck-theme',JSON.stringify({t:t,until:x.getTime()}))}catch(e){}icon()};
})();
