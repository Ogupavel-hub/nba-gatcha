const NBA_QUESTIONS = [
  {
    id: "players-on-court",
    question: "How many players from one team are on the court at the same time?",
    answer: "5",
    options: ["4", "5", "6", "7"],
  },
  {
    id: "shot-clock",
    question: "How many seconds are on the NBA shot clock?",
    answer: "24",
    options: ["20", "24", "30", "35"],
  },
  {
    id: "free-throw",
    question: "How many points is a made free throw worth?",
    answer: "1",
    options: ["1", "2", "3", "4"],
  },
  {
    id: "three-pointer",
    question: "How many points is a shot made beyond the three-point line worth?",
    answer: "3",
    options: ["1", "2", "3", "4"],
  },
  {
    id: "bulls-1996",
    question: "Which team won the 1996 NBA Finals?",
    answer: "Chicago Bulls",
    options: ["Chicago Bulls", "Seattle SuperSonics", "Houston Rockets", "Utah Jazz"],
  },
  {
    id: "mavericks-2011",
    question: "Which team won the 2011 NBA Finals?",
    answer: "Dallas Mavericks",
    options: ["Miami Heat", "Dallas Mavericks", "San Antonio Spurs", "Boston Celtics"],
  },
  {
    id: "cavaliers-2016",
    question: "Which team won the 2016 NBA Finals?",
    answer: "Cleveland Cavaliers",
    options: ["Golden State Warriors", "Cleveland Cavaliers", "Miami Heat", "Oklahoma City Thunder"],
  },
  {
    id: "finals-trophy",
    question: "What is the NBA championship trophy called?",
    answer: "Larry O'Brien Trophy",
    options: ["Larry O'Brien Trophy", "Bill Russell Cup", "Naismith Trophy", "Commissioner's Cup"],
  },
  {
    id: "kobe-draft",
    question: "Which team selected Kobe Bryant in the 1996 NBA Draft?",
    answer: "Charlotte Hornets",
    options: ["Los Angeles Lakers", "Charlotte Hornets", "Philadelphia 76ers", "Chicago Bulls"],
  },
  {
    id: "basket-height",
    question: "How high is an NBA basket from the floor?",
    answer: "10 feet",
    options: ["8 feet", "9 feet", "10 feet", "12 feet"],
  },
];

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function getRandomQuizQuestion() {
  const question = NBA_QUESTIONS[Math.floor(Math.random() * NBA_QUESTIONS.length)];
  return { ...question, options: shuffle(question.options) };
}
