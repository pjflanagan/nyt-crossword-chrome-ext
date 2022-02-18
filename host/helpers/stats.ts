import {
  keys,
  groupBy,
  mean,
  reduce,
  sum,
  round,
  min,
  orderBy,
  flatten,
  first,
  filter,
  map,
  includes,
  each,
  maxBy,
  last
} from 'lodash';
import moment from 'moment';


import { PlacedEntry, UserStat, DateTimeEntryMap, TimeEntry, Graph, Filter, GraphDateEntry } from 'types';

import { formatDate, formatDBDate } from '.';

type PowerRatingParams = {
  fastestTime: number;
  slowestTime: number;
  participantCount: number;
  time: number;
  place: number;
}

const getDayScore = ({
  fastestTime,
  slowestTime,
  participantCount,
  time,
  place,
}: PowerRatingParams): number => {
  // if you are the only participant that day
  // or everyone ties for first
  // you get a 1
  if (participantCount === 1 || fastestTime === slowestTime) {
    return 1;
  }
  const placeScore = (participantCount - place) / participantCount;
  const timeScore = (slowestTime - time) / (slowestTime - fastestTime);
  return (placeScore + timeScore) / 2;
}

export const getPlacedEntries = (orderedEntries: TimeEntry[]): PlacedEntry[] => {
  const placedEntries = [];
  let lastTime = 0;
  let place = 0;
  const fastestTime = first(orderedEntries).time;
  const slowestTime = last(orderedEntries).time;
  const participantCount = orderedEntries.length;
  orderedEntries.forEach((entry) => {
    if (lastTime !== entry.time) {
      ++place;
    }
    lastTime = entry.time;
    placedEntries.push({
      ...entry,
      place,
      moment: formatDBDate(entry.date),
      dayScore: getDayScore({
        fastestTime,
        slowestTime,
        participantCount,
        time: entry.time,
        place
      }),
    });
  });
  return placedEntries;
}

export const getDatesLeaderboards = (dateGroups: DateTimeEntryMap): PlacedEntry[] => {
  const dates = keys(dateGroups);
  const placedDates = dates.map(date => getPlacedEntries(dateGroups[date]));
  return flatten(placedDates);
};

export const makeFilteredEntries = (filterParams: Filter, placedEntries: PlacedEntry[]) => {
  let filteredEntries = placedEntries;
  if (filterParams.excludeMidis) {
    // filter the Saturday puzzle
    filteredEntries = filter(filteredEntries, (entry) => entry.moment.day() !== 6);
  }
  if (filterParams.duration) {
    const day = moment().subtract(filterParams.duration, 'day');
    filteredEntries = filter(filteredEntries, (entry) => entry.moment.isAfter(day));
  }
  return filteredEntries;
}

export const median = (times: number[]) => {
  if (times.length === 0) {
    return 0;
  }

  times.sort((a, b) => a - b);
  const half = Math.floor(times.length / 2);
  if (times.length % 2)
    return times[half];
  return mean([times[half - 1], times[half]]);
}

export const makeGraph = (placedEntries: PlacedEntry[], currentUsername: string): Graph => {
  const dateGroups = groupBy(placedEntries, 'date');
  const dates = keys(dateGroups).sort((a, b) => moment(a).diff(moment(b)));
  return dates.map((date): GraphDateEntry => {
    const dateLeaderboard = dateGroups[date];
    const orderedDateLeaderboard = orderBy(dateLeaderboard, 'time', 'asc');
    const averageTime = round(mean(dateLeaderboard.map(e => e.time)), 2);
    const medianTime = median(orderedDateLeaderboard.map(e => e.time));
    const bestTime = first(orderedDateLeaderboard).time;
    const bestTimeUsernames = map(
      filter(dateLeaderboard, (e) => e.time === bestTime),
      e => e.username
    );
    const currentUserEntry = dateLeaderboard.find(e => e.username === currentUsername);
    return {
      date: formatDate(date),
      averageTime,
      medianTime,
      bestTime,
      bestTimeUsernames,
      currentUsernameTime: currentUserEntry?.time,
      currentUsernamePlace: currentUserEntry?.place
    }
  });
}

export const makeTable = (placedEntries: PlacedEntry[]): UserStat[] => {
  const usernameGroups = groupBy(placedEntries, 'username');
  const dayCount = keys(groupBy(placedEntries, 'date')).length;
  const usernames = keys(usernameGroups);
  const userStats: UserStat[] = usernames.map(username => {
    const userEntries = usernameGroups[username];
    const userTimes = userEntries.map(e => e.time);
    const userPlaces = userEntries.map(e => e.place);
    const userScores = userEntries.map(e => e.dayScore);
    const averagePlace = round(mean(userPlaces), 2);
    return {
      username,
      bestTime: min(userTimes),
      averageTime: round(mean(userTimes), 2),
      firstPlaceFinishes: sum(userPlaces.filter(place => place === 1)),
      averagePlace,
      gamesPlayed: userEntries.length,
      power: {
        rating: round(1000 * sum(userScores) / dayCount, 2),
        index: undefined,
      },
    };
  });
  return orderBy(userStats, 'power.rating', 'desc').map((userStat, i) => {
    userStat.power.index = i + 1;
    return userStat;
  });
}

type StreakTracker = {
  [username: string]: {
    currentStreak: number;
    longestStreak: number;
  }
}

export const getLongestStreak = (bestTimeUsernamesByDate: string[][]) => {
  let streakTracker: StreakTracker = {};

  for (let i = 0; i < bestTimeUsernamesByDate.length; ++i) {
    const daysBestTimeUsernames = bestTimeUsernamesByDate[i];

    each(daysBestTimeUsernames, username => {
      if (!streakTracker[username]) {
        // if the entry does not exist, create it and initialize it
        streakTracker[username] = {
          currentStreak: 1,
          longestStreak: 0
        }
      } else {
        // if the entry does exist, add to their current streak
        streakTracker[username].currentStreak += 1;
      }
    });

    // for all the entries in streakTracker
    each(Object.keys(streakTracker), ((username) => {
      // if the currentStreak is longer than longestStreak replace it
      const entry = streakTracker[username];
      if (entry.currentStreak > entry.longestStreak) {
        entry.longestStreak = entry.currentStreak;
      }
      // if not in todaysBestTimeUsernames, set current streak to zero
      if (!includes(daysBestTimeUsernames, username)) {
        entry.currentStreak = 0;
      }
    }));
  }

  const streakTrackerArray = map(streakTracker, (e, username) => ({ ...e, username }));

  const longestStreakEntry = maxBy(streakTrackerArray, 'longestStreak');
  const longestStreak = longestStreakEntry?.longestStreak || 0;

  return {
    duration: longestStreak,
    usernames: filter(streakTrackerArray, e => e.longestStreak === longestStreak).map(e => e.username),
  }
}

export const getBestTime = (placedEntries: PlacedEntry[]) => {
  return first(orderBy(placedEntries, ['time', 'date'], ['asc', 'desc']));
}

export const getBestAveragePlace = (table: UserStat[]) => {
  return reduce(table, (bestUserStat, currentUserStat) => {
    if (currentUserStat.averagePlace < bestUserStat.averagePlace) {
      return currentUserStat;
    }
    return bestUserStat;
  });
}

export const getHighestPowerIndex = (table: UserStat[]) => {
  return first(table)
}

export const getAverageTime = (placedEntries: PlacedEntry[]) => {
  return mean(placedEntries.map(e => e.time));
}
