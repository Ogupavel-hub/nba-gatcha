const DYNASTY_DATA = [
  {
    id: "CHI96", short: "96 Bulls", name: "Chicago Bulls 1996", colors: ["#ce1141", "#111111"],
    players: [
      ["michael-jordan", "Michael Jordan", "MJ", 99, "legendary"],
      ["scottie-pippen", "Scottie Pippen", "SP", 95, "epic"],
      ["dennis-rodman", "Dennis Rodman", "DR", 89, "rare"],
      ["toni-kukoc", "Toni Kukoc", "TK", 84, "common"],
      ["ron-harper", "Ron Harper", "RH", 82, "common"],
    ],
  },
  {
    id: "LAL01", short: "01 Lakers", name: "Los Angeles Lakers 2001", colors: ["#552583", "#fdb927"],
    players: [
      ["kobe-bryant", "Kobe Bryant", "KB", 98, "legendary"],
      ["shaquille-oneal", "Shaquille O'Neal", "SHAQ", 99, "legendary"],
      ["derek-fisher", "Derek Fisher", "DF", 84, "common"],
      ["robert-horry", "Robert Horry", "RH", 85, "common"],
      ["rick-fox", "Rick Fox", "RF", 82, "common"],
    ],
  },
  {
    id: "BOS86", short: "86 Celtics", name: "Boston Celtics 1986", colors: ["#007a33", "#ba9653"],
    players: [
      ["larry-bird", "Larry Bird", "LB", 99, "legendary"],
      ["kevin-mchale", "Kevin McHale", "KM", 94, "epic"],
      ["robert-parish", "Robert Parish", "RP", 91, "rare"],
      ["dennis-johnson", "Dennis Johnson", "DJ", 88, "rare"],
      ["danny-ainge", "Danny Ainge", "DA", 84, "common"],
    ],
  },
  {
    id: "GSW17", short: "17 GSW", name: "Golden State Warriors 2017", colors: ["#1d428a", "#ffc72c"],
    players: [
      ["stephen-curry", "Stephen Curry", "SC", 98, "legendary"],
      ["kevin-durant", "Kevin Durant", "KD", 98, "legendary"],
      ["klay-thompson", "Klay Thompson", "KT", 93, "epic"],
      ["draymond-green", "Draymond Green", "DG", 91, "rare"],
      ["andre-iguodala", "Andre Iguodala", "AI", 86, "common"],
    ],
  },
  {
    id: "SAS14", short: "14 Spurs", name: "San Antonio Spurs 2014", colors: ["#c4ced4", "#111111"],
    players: [
      ["tim-duncan", "Tim Duncan", "TD", 96, "epic"],
      ["tony-parker", "Tony Parker", "TP", 92, "rare"],
      ["manu-ginobili", "Manu Ginobili", "MG", 90, "rare"],
      ["kawhi-leonard", "Kawhi Leonard", "KL", 89, "rare"],
      ["boris-diaw", "Boris Diaw", "BD", 83, "common"],
    ],
  },
  {
    id: "MIA13", short: "13 Heat", name: "Miami Heat 2013", colors: ["#98002e", "#f9a01b"],
    players: [
      ["lebron-james", "LeBron James", "LJ", 99, "legendary"],
      ["dwyane-wade", "Dwyane Wade", "DW", 95, "epic"],
      ["chris-bosh", "Chris Bosh", "CB", 91, "rare"],
      ["ray-allen", "Ray Allen", "RA", 87, "common"],
      ["shane-battier", "Shane Battier", "SB", 83, "common"],
    ],
  },
  {
    id: "DET04", short: "04 Pistons", name: "Detroit Pistons 2004", colors: ["#c8102e", "#1d42ba"],
    players: [
      ["chauncey-billups", "Chauncey Billups", "CB", 92, "rare"],
      ["richard-hamilton", "Richard Hamilton", "RH", 90, "rare"],
      ["tayshaun-prince", "Tayshaun Prince", "TP", 86, "common"],
      ["rasheed-wallace", "Rasheed Wallace", "RW", 89, "rare"],
      ["ben-wallace", "Ben Wallace", "BW", 93, "epic"],
    ],
  },
  {
    id: "HOU95", short: "95 Rockets", name: "Houston Rockets 1995", colors: ["#ce1141", "#f4f0e8"],
    players: [
      ["hakeem-olajuwon", "Hakeem Olajuwon", "HO", 99, "legendary"],
      ["clyde-drexler", "Clyde Drexler", "CD", 94, "epic"],
      ["robert-horry", "Robert Horry", "RH", 86, "common"],
      ["kenny-smith", "Kenny Smith", "KS", 85, "common"],
      ["mario-elie", "Mario Elie", "ME", 83, "common"],
    ],
  },
  {
    id: "DAL11", short: "11 Mavs", name: "Dallas Mavericks 2011", colors: ["#00538c", "#b8c4ca"],
    players: [
      ["dirk-nowitzki", "Dirk Nowitzki", "DN", 97, "legendary"],
      ["jason-kidd", "Jason Kidd", "JK", 89, "rare"],
      ["jason-terry", "Jason Terry", "JT", 88, "rare"],
      ["tyson-chandler", "Tyson Chandler", "TC", 87, "common"],
      ["shawn-marion", "Shawn Marion", "SM", 87, "common"],
    ],
  },
  {
    id: "CLE16", short: "16 Cavs", name: "Cleveland Cavaliers 2016", colors: ["#860038", "#fdbb30"],
    players: [
      ["lebron-james", "LeBron James", "LJ", 99, "legendary"],
      ["kyrie-irving", "Kyrie Irving", "KI", 95, "epic"],
      ["kevin-love", "Kevin Love", "KL", 90, "rare"],
      ["jr-smith", "J.R. Smith", "JR", 85, "common"],
      ["tristan-thompson", "Tristan Thompson", "TT", 84, "common"],
    ],
  },
];

export const DYNASTY_TEAMS = DYNASTY_DATA.map(({ players, ...team }) => team);

export const DYNASTY_PLAYERS = DYNASTY_DATA.flatMap((team) =>
  team.players.map(([slug, name, abbreviation, value, rarity]) => ({
    id: `dynasty-${team.id.toLowerCase()}-${slug}`,
    name,
    abbreviation,
    value,
    rarity,
    headshot: null,
    eraId: "dynasties",
    teamId: team.id,
    teamShort: team.short,
    teamName: team.name,
    teamColors: team.colors,
  })),
);
