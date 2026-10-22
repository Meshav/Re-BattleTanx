/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", 2013). One rating period = one ranked match:
 * every other player in it counts as one game (win 1, draw 0.5, loss 0) against their pre-match rating.
 */
export interface Rating { r: number; rd: number; vol: number; games: number }

export const newRating = (): Rating => ({ r: 1500, rd: 350, vol: 0.06, games: 0 });

const TAU = 0.5; // how fast volatility can change
const SCALE = 173.7178;
const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

export function rate(player: Rating, games: { opp: Rating; score: number }[]): Rating {
  if (!games.length) return player;
  const mu = (player.r - 1500) / SCALE, phi = player.rd / SCALE, sigma = player.vol;
  const opps = games.map(({ opp, score }) => ({ mu: (opp.r - 1500) / SCALE, phi: opp.rd / SCALE, score }));
  const v = 1 / opps.reduce((s, o) => s + g(o.phi) ** 2 * E(mu, o.mu, o.phi) * (1 - E(mu, o.mu, o.phi)), 0);
  const delta = v * opps.reduce((s, o) => s + g(o.phi) * (o.score - E(mu, o.mu, o.phi)), 0);
  // new volatility: Illinois-method root find (step 5 of the paper)
  const a = Math.log(sigma * sigma);
  const f = (x: number) => (Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x))) / (2 * (phi * phi + v + Math.exp(x)) ** 2) - (x - a) / (TAU * TAU);
  let A = a, B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A), fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
    B = C;
    fB = fC;
  }
  const sigma2 = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + sigma2 * sigma2);
  const phi2 = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const mu2 = mu + phi2 * phi2 * opps.reduce((s, o) => s + g(o.phi) * (o.score - E(mu, o.mu, o.phi)), 0);
  return { r: mu2 * SCALE + 1500, rd: Math.min(350, phi2 * SCALE), vol: sigma2, games: player.games + 1 };
}

/** Free-for-all placement → pairwise scores: you beat everyone you finished above. `place` is 0 = best; ties draw. */
export function rateMatch(players: { rating: Rating; place: number }[]): Rating[] {
  return players.map((p, i) => rate(p.rating, players.filter((_, j) => j !== i).map((o) => ({ opp: o.rating, score: p.place < o.place ? 1 : p.place === o.place ? 0.5 : 0 }))));
}

/** What a leaderboard shows: a conservative estimate (rating minus two deviations), so newcomers start low. */
export const displayRating = (x: Rating): number => Math.round(x.r - 2 * x.rd);
