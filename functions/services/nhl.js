/* eslint-disable arrow-body-style */
const dayjs = require('dayjs');

const DATE_FORMAT = 'YYYY-MM-DD';

const getTravel = (data, currentChampion) => {
  return data.dates[0].games[0].teams.home.team.id === currentChampion
    ? 'home'
    : 'away';
};

const getScores = (data) => {
  const { away, home } = data.dates[0].games[0].teams;

  const result = {
    home: {
      score: home.score,
      teamId: home.team.id,
      name: home.team.name,
    },
    away: {
      score: away.score,
      teamId: away.team.id,
      name: away.team.name,
    },
  };

  return result;
};

const getSchedule = async (teamId, yesterday) => {
  const ROOT = 'https://statsapi.web.nhl.com/api/v1/schedule';
  const queryParams = new URLSearchParams({
    teamId,
    expand: 'schedule.brodcasts',
    startDate: yesterday,
    endDate: yesterday,
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
  data.dates[0].games[0].teams[travel].team.id;

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

const getData = async ({ teamId, name }) => {
  const yesterday = dayjs().subtract('1', 'day').format(DATE_FORMAT);
  const data = await getSchedule(teamId, yesterday);
  const didPlay = Boolean(data.totalGames);
  // get gametype of P ? seasons over bby
  if (didPlay) {
    const champTravel = getTravel(data, teamId);
    const opponentTravel = champTravel === 'home' ? 'away' : 'home';
    const scores = getScores(data);
    const champion = scores[champTravel];
    const opponent = scores[opponentTravel];
    return {
      champion,
      opponent,
      didPlay,
      date: yesterday,
    };
  }

  return {
    champion: { teamId, name },
    opponent: { teamId: null, name: null },
    didPlay,
    date: yesterday,
  };
};

module.exports = {
  getData,
};