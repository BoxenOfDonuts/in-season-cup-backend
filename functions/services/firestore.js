// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const champDoc = db.collection('in-season-cup').doc('current-champion');
const userRef = db.collection('users');
const historyRef = db.collection('history');

const setChampion = async ({ teamId, name }) => {
  champDoc.set({
    teamId,
    name,
    lastUpdateDate: admin.firestore.Timestamp.now(),
  });
};

const updateChampion = async ({ name, teamId }) => {
  champDoc.update({
    teamId,
    name,
    lastUpdateDate: admin.firestore.Timestamp.now(),
  });
};

const getCurrentChampion = async () => {
  const doc = await champDoc.get();
  return {
    exists: doc.exists,
    teamId: doc.data()?.teamId || null,
    name: doc.data()?.name || null,
  };
};

const getUsersWithTeam = async (teamId) => {
  const docs = await userRef.where('teams', 'array-contains', teamId).get();
  return docs;
};

const incrementUserScore = async (doc) => {
  doc.ref.update({
    points: admin.firestore.FieldValue.increment(1),
  });
};

const incrementAllUserScores = async (docs) => {
  docs.forEach((doc) => incrementUserScore(doc));
};

const listUserDocs = async () => userRef.listDocuments();

const setUserDoc = async (user) => {
  userRef.doc().set(user);
};

const setUserDocs = async (users) => {
  users.forEach((user) => {
    setUserDoc(user);
  });
};

const setMatchHistory = async (info) => {
  historyRef.doc().set(info);
};

module.exports = {
  updateChampion,
  getCurrentChampion,
  getUsersWithTeam,
  incrementAllUserScores,
  listUserDocs,
  setUserDocs,
  setChampion,
  setMatchHistory,
};
