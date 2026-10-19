/* Dokodemo — push notifications (Sabbath 07:00 JST · Study reminder 20:00 JST). Runs from GitHub Actions. */
const admin = require('firebase-admin');
const { ceDateTime, ceMmDateTime, MMM, MMJ, MME } = require('./mmcal.js');

const MODE = (process.env.MODE || 'auto').trim();          // auto (Sabbath) | study | test
const SITE = 'https://myaingstudy.github.io/';
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA)) });
const db = admin.firestore();

/* today in Japan time */
const jst = new Date(Date.now() + 9 * 3600e3);
function mmDay(y, m, d) {
  const jdn = Math.round(ceDateTime.w2j(y, m, d)), o = ceMmDateTime.j2m(jdn);
  const mi = (o.myt > 0 && o.mm === 4) ? -1 : o.mm;
  const mn = mi < 0 ? ['ဒုတိယဝါဆို', '第二ワーゾー', 'Second Waso'] : [MMM[mi], MMJ[mi], MME[mi]];
  return { sb: ceMmDateTime.cal_sabbath(o.md, o.mm, o.myt), mp: ceMmDateTime.cal_mp(o.md, o.mm, o.myt), mn };
}
function kind(x) {
  if (x.mp === 1) return [x.mn[0] + 'လပြည့်နေ့', x.mn[1] + 'の満月', x.mn[2] + ' full moon'];
  if (x.mp === 3) return [x.mn[0] + 'လကွယ်နေ့', x.mn[1] + 'の新月', x.mn[2] + ' new moon'];
  if (x.mp === 0) return ['လဆန်း ၈ ရက် အဋ္ဌမီနေ့', '上弦の八日', '8th waxing day'];
  return ['လဆုတ် ၈ ရက် အဋ္ဌမီနေ့', '下弦の八日', '8th waning day'];
}

/* Study reminders — a different message each day (3 languages) */
const STUDY = [
  ['📚 စာလုပ်ချိန် ရောက်ပါပြီ', 'ဒီနေ့ ၅ မိနစ်လောက် ဂျပန်စာ လေ့လာရအောင် 💪', '📚 勉強の時間です', '今日も5分だけ日本語を勉強しましょう 💪', '📚 Study time', 'Just 5 minutes of Japanese today 💪'],
  ['🍱 ညစာ စားပြီးပြီလား', 'စားပြီးရင် ဝေါဟာရ ၅ လုံးလောက် ကျက်ကြည့်ရအောင်နော် 😊', '🍱 晩ごはん食べた？', '食べたら単語を5つ覚えましょう 😊', '🍱 Had dinner?', 'After eating, let’s learn 5 new words 😊'],
  ['🌙 စာလုပ်ဖို့ မမေ့နဲ့နော်', 'နည်းနည်းချင်း နေ့တိုင်းလုပ်ရင် တကယ်တော်လာမှာပါ ✨', '🌙 勉強を忘れずに', '毎日少しずつが一番の近道です ✨', '🌙 Don’t forget to study', 'A little every day goes a long way ✨'],
  ['🔥 ဒီနေ့ စာလုပ်ပြီးပြီလား', 'Streak မပျက်အောင် ခဏလေး ဝင်လေ့လာလိုက်ပါ', '🔥 今日の勉強はもう済んだ？', '連続記録を続けましょう', '🔥 Studied today?', 'Keep your streak going'],
  ['🎌 頑張って！', 'ကြိုးစားပါ — ဒီနေ့ သင်ခန်းစာ တစ်ခုလောက် လုပ်ကြည့်ရအောင်', '🎌 頑張って！', '今日はレッスンを1つやってみましょう', '🎌 Ganbatte!', 'Try one lesson today'],
  ['🎧 နားထောင်ချိန်လေး', 'ဂျပန် သီချင်း ဒါမှမဟုတ် စကားပြော တစ်ပုဒ်လောက် နားထောင်ကြည့်ပါ', '🎧 リスニングの時間', '日本語の歌や会話を聞いてみましょう', '🎧 Listening time', 'Listen to a Japanese song or conversation'],
  ['✍️ ကန်ဂျီ တစ်လုံး', 'ဒီနေ့ ကန်ဂျီ အသစ် တစ်လုံးလောက် မှတ်ကြည့်ရအောင်', '✍️ 今日の漢字', '新しい漢字を1つ覚えましょう', '✍️ One kanji', 'Learn one new kanji today'],
  ['☕ ခဏနားပြီး စာလုပ်ရအောင်', 'တစ်နေ့တာ ပင်ပန်းခဲ့ရင်တောင် ၃ မိနစ်လောက်ဆို လုံလောက်ပါတယ် 🙂', '☕ 一息ついて勉強', '疲れた日は3分だけでも大丈夫 🙂', '☕ Take a break & study', 'Even 3 minutes is enough on a tiring day 🙂'],
  ['🧠 ပြန်နွှေးချိန်', 'မနေ့က လေ့လာခဲ့တာလေးတွေ ပြန်ကြည့်ရအောင်', '🧠 復習の時間', '昨日の内容を復習しましょう', '🧠 Review time', 'Let’s review what you learned yesterday'],
  ['🌸 どこでも日本語', 'ဘယ်နေရာမှာမဆို ဂျပန်စာ — ဒီနေ့လည်း အတူတူ လေ့လာရအောင်', '🌸 どこでも日本語', '今日も一緒に勉強しましょう', '🌸 Japanese anywhere', 'Let’s study together today']
];
function studyMessage() {
  const day = Math.floor(jst.getTime() / 864e5), r = STUDY[day % STUDY.length];
  return { my: [r[0], r[1]], ja: [r[2], r[3]], en: [r[4], r[5]] };
}
function message() {
  if (MODE === 'study') return studyMessage();
  if (MODE === 'test') return {
    my: ['🔔 Dokodemo', 'Notification စနစ် စမ်းသပ်ခြင်း — ဒီစာ ရောက်ရင် အဆင်ပြေပါပြီ ✅'],
    ja: ['🔔 Dokodemo', '通知のテストです ✅'],
    en: ['🔔 Dokodemo', 'Test notification — it works ✅'] };
  const t = mmDay(jst.getUTCFullYear(), jst.getUTCMonth() + 1, jst.getUTCDate());
  if (t.sb === 1) { const k = kind(t); return {
    my: ['☸ ယနေ့ ဥပုသ်နေ့ (' + k[0] + ')', 'ဗုဒ္ဓဘာသာဝင်တို့၏ နေ့ထူးနေ့မြတ် ဖြစ်ပါသည်။ တတ်စွမ်းနိုင်သမျှ ကုသိုလ်ကောင်းမှုများ ဆည်းပူးနိုင်ကြပါစေ 🙏'],
    ja: ['☸ 今日は布薩日（' + k[1] + '）', '仏教徒にとって大切な日です。できる限り善い行いを心がけましょう 🙏'],
    en: ['☸ Today is Sabbath day (' + k[2] + ')', 'A special day for Buddhists. May we do as many good deeds as we can 🙏'] }; }
  if (t.sb === 2) {
    const n = new Date(jst.getTime() + 864e5), k = kind(mmDay(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()));
    return {
    my: ['☸ မနက်ဖြန် ဥပုသ်နေ့ (' + k[0] + ')', 'ယနေ့ အဖိတ်နေ့ ဖြစ်ပါသည်။ ကုသိုလ်ကောင်းမှုများ ပြုလုပ်နိုင်ရန် ကြိုတင်ပြင်ဆင်ထားကြပါစို့ 🙏'],
    ja: ['☸ 明日は布薩日（' + k[1] + '）', '善い行いの準備をしておきましょう 🙏'],
    en: ['☸ Tomorrow is Sabbath day (' + k[2] + ')', 'Let us prepare to do good deeds 🙏'] }; }
  return null;
}

(async () => {
  const msg = message();
  if (!msg) { console.log('Not a sabbath / eve day (JST ' + jst.toISOString().slice(0, 10) + ') — nothing to send.'); return; }
  const snap = await db.collection('pushTokens').get();
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.token)
    .filter(x => MODE === 'test' ? true : MODE === 'study' ? x.st === true : x.sb !== false);
  console.log('Subscribers:', list.length);
  let ok = 0, removed = 0;
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    const res = await admin.messaging().sendEach(chunk.map(x => {
      const [title, body] = msg[x.lang] || msg.my;
      return { token: x.token, data: { title, body, url: SITE, tag: MODE === 'study' ? 'dokodemo-study' : 'dokodemo-sabbath' },
        webpush: { headers: { Urgency: 'high', TTL: '43200' } },
        android: { priority: 'high' } };
    }));
    for (let j = 0; j < res.responses.length; j++) {
      const r = res.responses[j];
      if (r.success) { ok++; continue; }
      const code = r.error && r.error.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token' || code === 'messaging/invalid-argument') {
        await db.collection('pushTokens').doc(chunk[j].id).delete().catch(() => {}); removed++;
      } else console.log('fail:', code);
    }
  }
  console.log('Sent:', ok, ' Removed stale tokens:', removed);
})().catch(e => { console.error(e); process.exit(1); });
