import find from 'lodash/find';
import {
  IChessboard,
  TArea,
  IMoveDetails,
} from '../../types';
import {
  IGame,
  TElementWithGame,
  IMoveEvent,
} from './types';
import {
  squareToCoords,
} from '../../utils';
import {
  dispatchPointerEvent,
} from '../../dom-events';

/**
 * Chessboard implemented with some kinds of web components
 * Beta in April 2020
 */
export class ComponentChessboard implements IChessboard {
  element: TElementWithGame
  game: IGame

  constructor(element: Element) {
    this.element = <TElementWithGame>element;
    this.game = this.element.game;

    this.game.on('Move', () => {
      const event = new Event('ccHelper-draw');
      document.dispatchEvent(event);
    });
  }

  getElement() {
    return this.element;
  }

  getRelativeContainer() {
    return this.element;
  }

  makeMove(fromSq: TArea, toSq: TArea, promotionPiece?: string) {
    const move = { from: fromSq, to: toSq };
    const moveDetails = this.game.getMove(move);
    const isPromotion = Boolean(moveDetails.promotion);

    if (!isPromotion || !promotionPiece) {
      const fromCoords = squareToCoords(fromSq).join('');
      const pieceElement = this.element.querySelector(`.piece.square-${fromCoords}`);
      if (pieceElement) {
        const fromPosition = this._getSquarePosition(fromSq);
        dispatchPointerEvent(pieceElement, 'pointerdown', {
          x: fromPosition.x,
          y: fromPosition.y,
        });

        const toPosition = this._getSquarePosition(toSq);
        dispatchPointerEvent(pieceElement, 'pointerup', {
          x: toPosition.x,
          y: toPosition.y,
        });
      }
    } else {
      this.game.move({
        ...move,
        promotion: promotionPiece,
        animate: false
      });
    }
  }

  isLegalMove(fromSq: TArea, toSq: TArea) {
    const legalMoves = this.game.getLegalMoves();
    return Boolean(find(legalMoves, { from: fromSq, to: toSq }));
  }

  isPlayersMove() {
    return this.game.getTurn() === this.game.getPlayingAs();
  }

  getPiecesSetup() {
    const pieces = this.game.getPieces().getCollection();
    return Object.values(pieces).reduce((acc, piece) => ({
      ...acc,
      [piece.square]: {
        color: piece.color, type: piece.type, area: piece.square
      }
    }), {});
  }

  markArrow(fromSq: TArea, toSq: TArea) {
    const arrowCoords = `${fromSq}${toSq}`;
    const markings = this.game.getMarkings();
    if (!markings.arrow[arrowCoords]) {
      this.game.toggleMarking({ key: arrowCoords, type: 'arrow' });
    }
  }

  unmarkArrow(fromSq: TArea, toSq: TArea) {
    const arrowCoords = `${fromSq}${toSq}`;
    const markings = this.game.getMarkings();
    if (markings.arrow[arrowCoords]) {
      this.game.toggleMarking({ key: arrowCoords, type: 'arrow' });
    }
  }

  clearMarkedArrows() {
    this.game.clearMarkings(['arrow']);
  }

  markArea(square: TArea) {
    const markings = this.game.getMarkings();
    if (!markings.square[square]) {
      this.game.toggleMarking({ key: square, type: 'square' });
    }
  }

  unmarkArea(square: TArea) {
    const markings = this.game.getMarkings();
    if (markings.square[square]) {
      this.game.toggleMarking({ key: square, type: 'square' });
    }
  }

  onMove(fn: (move: IMoveDetails) => void) : void {
    this.game.on('Move', (event) => fn(this._getMoveData(event)));
  }

  _getMoveData(event: IMoveEvent): IMoveDetails {
    const data = event.data.move;
    let moveType = 'move';
    if (data.san.startsWith('O-O-O')) {
      moveType = 'long-castling';
    } else if (data.san.startsWith('O-O')) {
      moveType = 'short-castling';
    } else if (data.capturedStr) {
      moveType = 'capture';
    }

    return {
      piece: data.piece,
      moveType,
      from: data.from,
      to: data.to,
      promotionPiece: data.promotion,
      check: /\+$/.test(data.san),
      checkmate: /\#$/.test(data.san),
    };
  }

  _getSquarePosition(square: TArea, fromDoc: boolean = true) {
    const isFlipped = this.element.classList.contains('flipped');
    const coords = squareToCoords(square);
    const {left, top, width} = this.element.getBoundingClientRect();
    const squareWidth = width / 8;
    const correction = squareWidth / 2;

    if (!isFlipped) {
      return {
        x: (fromDoc ? left : 0) + squareWidth * coords[0] - correction,
        y: (fromDoc ? top : 0) + width - squareWidth * coords[1] + correction,
      };
    } else {
      return {
        x: (fromDoc ? left : 0) + width - squareWidth * coords[0] + correction,
        y: (fromDoc ? top : 0) + squareWidth * coords[1] - correction,
      };
    }
  }
}
