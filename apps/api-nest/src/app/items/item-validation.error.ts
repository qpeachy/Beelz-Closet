export class ItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ItemValidationError';
  }
}

export class ItemNotFoundError extends Error {
  constructor() {
    super('Pièce introuvable');
    this.name = 'ItemNotFoundError';
  }
}
