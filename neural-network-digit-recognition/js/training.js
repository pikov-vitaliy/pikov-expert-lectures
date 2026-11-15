export const EPOCH_COUNT = 12;
export const TRAINING_RATE = 0.3;

export function createTrainingRandom(seed = 20261114) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function trainEpoch(network, samples, random = createTrainingRandom()) {
  const order = [...samples];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [order[index], order[target]] = [order[target], order[index]];
  }
  for (const sample of order) network.trainExample(sample.pixels, sample.label, TRAINING_RATE);
  return network.evaluate(samples);
}
