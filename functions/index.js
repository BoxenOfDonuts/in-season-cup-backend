import functions from 'firebase-functions';
import dayjs from 'dayjs';
import { champ, users } from './scripts/data.js';
import { getData, getDataByDate } from './services/nhl.js';
import {
  updateChampion,
  getCurrentChampion,
  getUsersWithTeam,
  incrementAllUserScores,
  listUserDocs,
  setUserDocs,
  setChampion,
  setMatchHistory,
} from './services/firestore.js';

const { log } = functions.logger;

const updateChampionDaily = functions.pubsub
  .topic('for-the-cup')
  .onPublish(async () => {
    const doc = await getCurrentChampion();

    if (!doc.exists) {
      const message = 'no current champion';
      log(message);
      return;
    }

    const currentChampion = { teamId: doc.teamId, name: doc.name };
    const { champion, opponent, didPlay, date } = await getData(
      currentChampion
    );

    await setMatchHistory({ champion, opponent, date });

    if (!didPlay) {
      await updateChampion(currentChampion);
      const message = 'did not play, existing champ stays';
      log(message);
      return;
    }

    if (champion.score < opponent.score) {
      log('New Champion!', opponent);
      await updateChampion(opponent);
      return;
    }
    log('Existing Champ Won!');
    await updateChampion(currentChampion);
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

const fillHistory = functions.https.onRequest(async (req, res) => {
  let day = dayjs('2022-10-10');

  while (!day.isSame(dayjs('2022-12-19'))) {
    await new Promise((r) => {
      setTimeout(r, 500);
    });

    day = dayjs(day).add(1, 'day');
    const doc = await getCurrentChampion();
    const currentChampion = { teamId: doc.teamId, name: doc.name };
    const { champion, opponent, didPlay, date } = await getDataByDate(
      currentChampion,
      day
    );
    console.log(champion, opponent, date);
    await setMatchHistory({ champion, opponent, date });
    if (!didPlay) {
      await updateChampion(currentChampion);
      const message = 'did not play, existing champ stays';
      log(message);
    } else if (champion.score < opponent.score) {
      log('New Champion!', opponent);
      await updateChampion(opponent);
    } else {
      log('Existing Champ Won!');
      await updateChampion(currentChampion);
    }
  }
  return res.json({ message: 'done!' });
});

export { updateChampionDaily, addPoints, updateData, fillHistory };
