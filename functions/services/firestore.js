// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const champDoc = db.collection('in-season-cup').doc('current-champion');
const userRef = db.collection('users');
const historyRef = db.collection('history');

const setChampionDB = async (teamId) => {
  champDoc.set({
    teamId,
    lastUpdateDate: admin.firestore.Timestamp.now(),
  });
};

const updateChampionDB = async (teamId) => {
  champDoc.update({
    teamId,
    lastUpdateDate: admin.firestore.Timestamp.now(),
  });
};

const getCurrentChampion = async () => {
  const doc = await champDoc.get();
  return {
    exists: doc.exists,
    teamId: doc.data()?.teamId || null,
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
  updateChampionDB,
  getCurrentChampion,
  getUsersWithTeam,
  incrementAllUserScores,
  listUserDocs,
  setUserDocs,
  setChampionDB,
  setMatchHistory,
};
