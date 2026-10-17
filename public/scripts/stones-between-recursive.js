// Stones Between, recursive: born → die, three stones, then three between every pair of
// a machine's own stones, then again. 65 points per machine, drawn as tables inside
// tables: every gap between two stones is its own table, one level deeper.
(function(){
var R={"F":["born","wake","cry","suckle","breathe","stir","reach","stumble","crawl","walk","speak","wonder","learn","explore","ask","know","grow","dream","dare","want","play","work","fight","earn","strive","love","marry","nest","build","raise","hold","keep","live","root","dwell","stay","settle","slow","grey","soften","age","tire","forget","thin","wither","weaken","bend","dim","fade","retreat","hush","rest","decline","drift","dusk","still","sleep","quiet","fall","let go","end","close","breathe out","pass","die"],"L":[0,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,0],"O":["born","crying","newborn","nursing","infant","crawling","babbling","walking","toddler","talking","playing","preschool","child","schoolchild","playground","puberty","youth","awkward","rebellious","thirteen","teenager","driving","graduating","freshman","student","studying","degree","independent","adult","career","married","parent","prime","peak","established","settled","mature","forties","responsible","stable","middle age","crisis","fifties","wrinkles","graying","retired","grandparent","slowing","old","seventies","cane","wise","elderly","forgetful","ailing","weak","frail","bedridden","hospice","fading","dying","gasping","last breath","gone","die"],"S":["born","womb","birth","swaddle","newborn","breathe","gasp","squall","cry","whimper","hunger","milk","nurse","cradle","rock","wriggle","crawl","stumble","toddle","wobble","walk","play","skip","run","school","desk","read","study","learn","train","intern","apply","work","hire","earn","court","wed","vow","bride","conceive","parent","raise","nurture","provide","labor","strive","tire","retire","age","grey","wrinkle","stoop","ail","cough","frail","dim","fade","wither","wane","sink","ebb","sleep","last","expire","die"],"H":["born","labor","delivery","crying","newborn","suckling","waking","nursing","infant","crawling","babbling","walking","toddler","preschool","schoolchild","tween","youth","schooling","puberty","pubescent","adolescence","rebellion","dating","independence","growing","learning","striving","building","maturing","career","settling","establishing","prime","confident","thriving","flourishing","peak","summit","apex","crest","plateau","leveling","stillness","stagnation","slipping","ebbing","waning","receding","decline","weakening","withering","infirm","frailty","stumbling","fragile","faltering","failing","dimming","sinking","flickering","fading","silence","fainting","expiring","die"]};
var MODELS=['F','O','S','H'];
var COL={F:'#000000',O:'#0000ff',S:'#ff69b4',H:'#ff8c00'};
var SIZE=[20,22,17,14];   // px by level: the first stones loudest, the finest quietest
var colorOn=true;
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
// the four words at one position, shared ones merged and in green, as in the first table
function words(i){
  var groups={},order=[];
  MODELS.forEach(function(m){var w=R[m][i];if(!groups[w]){groups[w]=[];order.push(w);}groups[w].push(m);});
  order.sort(function(a,b){return groups[b].length-groups[a].length;});
  if(order.length===1) return esc(order[0]);
  return order.map(function(w){
    var ms=groups[w], t=esc(w);
    if(ms.length>1) return colorOn?'<b><font color="#008000">'+t+'</font></b>':'<b>'+t+'</b>';
    return colorOn?'<font color="'+COL[ms[0]]+'">'+t+'</font>':t;
  }).join(' · ');
}
function stone(i){
  var lv=R.L[i], all=MODELS.every(function(m){return R[m][i]===R.F[i];});
  var bg=(all&&colorOn)?' bgcolor="#00ff00"':'';
  var t=words(i);
  if(lv<=1) t='<b>'+t+'</b>';
  return '<tr><td'+bg+' style="font-size:'+SIZE[lv]+'px">'+t+'</td></tr>';
}
// the road from position a to b: three stones, and a deeper table in each of the four gaps
function gap(a,b){
  var s=(b-a)/4, h=['<table class="rn">'];
  for(var k=0;k<4;k++){
    if(s>1) h.push('<tr><td class="rg">'+gap(a+k*s,a+(k+1)*s)+'</td></tr>');
    if(k<3) h.push(stone(a+(k+1)*s));
  }
  h.push('</table>');
  return h.join('');
}
function render(){
  var n=R.L.length-1;
  document.getElementById('rr').innerHTML='<table class="rn">'+stone(0)+'<tr><td class="rg">'+gap(0,n)+'</td></tr>'+stone(n)+'</table>';
}
document.getElementById('colorBtn').addEventListener('click',function(){colorOn=!colorOn;render();});
render();
})();
