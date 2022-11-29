declare module 'markov-chains' {
  const DEFAULT_STATE_SIZE = 1;

  export default class Chain<T> {
    constructor(
      corpusOrModel : Map<string, T> | T[][],
      { stateSize } ?: { stateSize : number }
    );

    static build<K>(
      corpus : K[][],
      { stateSize } ?: { stateSize : number }
    ) : Map<string, Map<string, any>>;

    static fromJSON<K>(jsonData : string) : Chain<K>;

    toJSON() : string;

    move(fromState : T[]) : T[] | undefined;

    walk(fromState ?: T[]) : T[];
  }
}
