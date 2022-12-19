// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
// make this easier

const functions = require('firebase-functions');

// The Firebase Admin SDK to access Firestore.
// const admin = require('firebase-admin');

// admin.initializeApp();

const { champ, users } = require('./scripts/data');
const {
  updateChampionDB,
  getCurrentChampion,
  getUsersWithTeam,
  incrementAllUserScores,
  listUserDocs,
  setUserDocs,
  setChampionDB,
  setMatchHistory,
} = require('./services/firestore');

const { log } = functions.logger;
// const db = admin.firestore();

const updateChampion = functions.https.onRequest(async (req, res) => {
  // get the id of the current champion
  const doc = await getCurrentChampion();

  if (!doc.exists) return res.json({ error: 'no current champion' });

  const currentChampion = doc.teamId;
  const didPlay = await didPlayYesterday(currentChampion);
  if (!didPlay) {
    await updateChampionDB(currentChampion);
    return res.json({ message: 'did not play, existing champ stays' });
  }

  const data = await getGameResults(currentChampion);
  const champTravel = getTravel(data, currentChampion);
  const opponentTravel = champTravel === 'home' ? 'away' : 'home';
  const scores = getScores(data);

  const championScore = scores[champTravel];
  const opponentScore = scores[opponentTravel];

  if (championScore < opponentScore) {
    const newChamptionId = getOpponentId(data, opponentTravel);
    log('New Champion!', { id: newChamptionId });
    await updateChampionDB(newChamptionId);
    return res.json({ result: currentChampion, newChamptionId });
  }
  log('Existing Champ stays!');
  await updateChampionDB(currentChampion);
  return res.json({ message: 'Existing Champ Wins!' });
});

const getGameResults = async (teamId) => {
  const ROOT = 'https://statsapi.web.nhl.com/api/v1/teams';
  const queryParams = new URLSearchParams({
    expand: 'team.schedule.previous',
    gameType: 'R',
  });
  const url = `${ROOT}/${teamId}?${queryParams}`;
  const response = await fetch(url);
  return response.json();
};

const getTravel = (data, currentChampion) =>
  data.teams[0].previousGameSchedule.dates[0].games[0].teams.home.team.id ===
  currentChampion
    ? 'home'
    : 'away';

const getScores = (data) => {
  const homeTeamScore =
    data.teams[0].previousGameSchedule.dates[0].games[0].teams.home.score;
  const awayTeamScore =
    data.teams[0].previousGameSchedule.dates[0].games[0].teams.away.score;

  return {
    home: homeTeamScore,
    away: awayTeamScore,
  };
};

const getSchedule = async (teamId) => {
  const ROOT = 'https://statsapi.web.nhl.com/api/v1/schedule';
  const queryParams = new URLSearchParams({
    teamId,
    expand: 'schedule.brodcasts',
    startDate: '2022-12-18',
    endDate: '2022-12-18',
    gameType: 'R',
  });
  const url = `${ROOT}?${queryParams}`;
  const response = await fetch(url);
  return response.json();
};

const didPlayYesterday = async (teamId) => {
  const data = await getSchedule(teamId);

  return Boolean(data.totalGames);
};

const getOpponentId = (data, travel) =>
  data.teams[0].previousGameSchedule.dates[0].games[0].teams[travel].team.id;

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
    setChampionDB(champ.teamId);
  } else {
    return res.json({ message: 'data exists' });
  }

  return res.json({ success: true });
});

module.exports = {
  updateChampion,
  addPoints,
  updateData,
};
