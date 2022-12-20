const functions = require('firebase-functions');
const { champ, users } = require('./scripts/data');
const { getData } = require('./services/nhl');
const {
  updateChampion,
  getCurrentChampion,
  getUsersWithTeam,
  incrementAllUserScores,
  listUserDocs,
  setUserDocs,
  setChampion,
  setMatchHistory,
} = require('./services/firestore');

const { log } = functions.logger;

const updateChampionDaily = functions.https.onRequest(async (req, res) => {
  const doc = await getCurrentChampion();

  if (!doc.exists) return res.json({ error: 'no current champion' });

  const currentChampion = { teamId: doc.teamId, name: doc.name };
  const { champion, opponent, didPlay, date } = await getData(currentChampion);

  await setMatchHistory({ champion, opponent, date });

  if (!didPlay) {
    await updateChampion(currentChampion);
    return res.json({ message: 'did not play, existing champ stays' });
  }

  if (champion.score < opponent.score) {
    const { teamId, name } = opponent;
    log('New Champion!', { teamId, name });
    await updateChampion({ teamId, name });
    return res.json({ result: currentChampion, teamId });
  }
  log('Existing Champ stays!');
  await updateChampion(currentChampion);
  return res.json({ message: 'Existing Champ Wins!' });
});

const addPoints = functions.firestore
  .document('/in-season-cup/current-champion')
  .onUpdate(async (change) => {
    const value = change.after.data() || {};
    const docs = await getUsersWithTeam(value.teamId);

    if (docs.empty) {
      log('no mathing docs');
      return;
    }
    incrementAllUserScores(docs);
  });

const updateData = functions.https.onRequest(async (req, res) => {
  const docs = await listUserDocs();

  if (!docs.length) {
    setUserDocs(users);
    setChampion(champ);
  } else {
    return res.json({ message: 'data exists' });
  }

  return res.json({ success: true });
});

module.exports = {
  updateChampionDaily,
  addPoints,
  updateData,
};
