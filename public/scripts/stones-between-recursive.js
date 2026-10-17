// Stones Between, recursive: born → die, three stones, then three between every pair of
// a machine's own stones, then again. 65 points per machine, read position by position.
(function(){
var R={"F":["born","wake","cry","suckle","breathe","stir","reach","stumble","crawl","walk","speak","wonder","learn","explore","ask","know","grow","dream","dare","want","play","work","fight","earn","strive","love","marry","nest","build","raise","hold","keep","live","root","dwell","stay","settle","slow","grey","soften","age","tire","forget","thin","wither","weaken","bend","dim","fade","retreat","hush","rest","decline","drift","dusk","still","sleep","quiet","fall","let go","end","close","breathe out","pass","die"],"L":[0,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,1,3,3,3,2,3,3,3,2,3,3,3,2,3,3,3,0],"O":["born","crying","newborn","nursing","infant","crawling","babbling","walking","toddler","talking","playing","preschool","child","schoolchild","playground","puberty","youth","awkward","rebellious","thirteen","teenager","driving","graduating","freshman","student","studying","degree","independent","adult","career","married","parent","prime","peak","established","settled","mature","forties","responsible","stable","middle age","crisis","fifties","wrinkles","graying","retired","grandparent","slowing","old","seventies","cane","wise","elderly","forgetful","ailing","weak","frail","bedridden","hospice","fading","dying","gasping","last breath","gone","die"],"S":["born","womb","birth","swaddle","newborn","breathe","gasp","squall","cry","whimper","hunger","milk","nurse","cradle","rock","wriggle","crawl","stumble","toddle","wobble","walk","play","skip","run","school","desk","read","study","learn","train","intern","apply","work","hire","earn","court","wed","vow","bride","conceive","parent","raise","nurture","provide","labor","strive","tire","retire","age","grey","wrinkle","stoop","ail","cough","frail","dim","fade","wither","wane","sink","ebb","sleep","last","expire","die"],"H":["born","labor","delivery","crying","newborn","suckling","waking","nursing","infant","crawling","babbling","walking","toddler","preschool","schoolchild","tween","youth","schooling","puberty","pubescent","adolescence","rebellion","dating","independence","growing","learning","striving","building","maturing","career","settling","establishing","prime","confident","thriving","flourishing","peak","summit","apex","crest","plateau","leveling","stillness","stagnation","slipping","ebbing","waning","receding","decline","weakening","withering","infirm","frailty","stumbling","fragile","faltering","failing","dimming","sinking","flickering","fading","silence","fainting","expiring","die"]};
var MODELS=['F','O','S','H'];
var COL={F:'#000000',O:'#0000ff',S:'#ff69b4',H:'#ff8c00'};
var colorOn=true;
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function render(){
  var h=['<table class="rr"><tr><th>level</th><th>Fable 5.1</th><th>Opus 5.5</th><th>Sonnet 5.5</th><th>Haiku 5.5</th></tr>'];
  for(var i=0;i<R.L.length;i++){
    var lv=R.L[i];
    if(lv===0){
      var bg=colorOn?' bgcolor="#00ff00"':'';
      h.push('<tr><td></td><td colspan="4" align="center"'+bg+'><b>'+esc(R.F[i])+'</b></td></tr>');
      continue;
    }
    var row='<tr><td align="center">'+lv+'</td>';
    MODELS.forEach(function(m){
      var w=R[m][i], shared=MODELS.some(function(o){return o!==m&&R[o][i]===w;});
      var txt=esc(w);
      if(lv===1) txt='<b>'+txt+'</b>';
      if(shared) txt=colorOn?'<b><font color="#008000">'+txt+'</font></b>':'<b>'+txt+'</b>';
      else if(colorOn) txt='<font color="'+COL[m]+'">'+txt+'</font>';
      row+='<td>'+txt+'</td>';
    });
    h.push(row+'</tr>');
  }
  h.push('</table>');
  document.getElementById('rr').innerHTML=h.join('');
}
document.getElementById('colorBtn').addEventListener('click',function(){colorOn=!colorOn;render();});
render();
})();
