var fChess = fChess || {};

fChess.Piece = (function () {
    'use strict';

    //constructor
    var Piece = function (color) {
        this.color = color;
        this.availableMoves = [];
        this.blockedMoves = [];
    };

    //fields
    Piece.prototype.alive = true;
    Piece.prototype.isMoved = false;
    Piece.prototype.color = '';
    Piece.prototype.availableMoves = null;
    Piece.prototype.blockedMoves = null; // used for cells blocked by the piece's friends

    //functions
    Piece.prototype.findCell = function (cells) {
        for (var i = 0; i < cells.length; i++) {
            if (cells[i].piece == this) {
                return cells[i];
            }
        }

        return null;
    };

    // This function finds the common moves that two pieces can make
    Piece.prototype.encounter = function (anotherPiece) {
        var intersection = [];
        var enemyMoves = [];

        if (anotherPiece instanceof fChess.PawnPiece) {
            // for the pawn, we only consider the moves that it can make to capture
            // an enemy, not the ones used for moving
            enemyMoves = anotherPiece.potentialMoves.concat(anotherPiece.blockedMoves);
        } else {
            // we need to consider all possible moves that a piece can make, not just
            // the ones that they can go. These possible moves include all the available
            // moves and the ones blocked by its "friends".
            enemyMoves = anotherPiece.availableMoves.concat(anotherPiece.blockedMoves);;
        }

        this.availableMoves.forEach(function (move) {
            enemyMoves.forEach(function (enemyMove) {
                if (move === enemyMove) {
                    intersection.push(move);
                }
            }.bind(this));
        }.bind(this));

        return intersection;
    };

    // This function removes all the specified moves from a piece's available moves
    Piece.prototype.disregardMoves = function (moves) {
        moves.forEach(function (move) {
            if (this.availableMoves.indexOf(move) != -1) {
                this.availableMoves.splice(this.availableMoves.indexOf(move), 1);
            }
        }.bind(this));
    };

    Piece.prototype.refreshMoves = function () {
        this.availableMoves.length = 0;
        this.blockedMoves.length = 0;
    };

    // this function is used by the king primarily to calculate the moves
    // that it can make without being taken by an enemy
    Piece.prototype.avoidEnemies = function (boardCells) {
        boardCells.forEach(function (cell) {
            if (!cell.isEmpty()) {
                if (this.isEnemy(cell.piece)) {
                    var enemy = cell.piece;
                    enemy.refreshMoves();
                    enemy.findMoves(boardCells);
                    var dangerousMoves = this.encounter(enemy);
                    this.disregardMoves(dangerousMoves);
                }
            }
        }.bind(this));
    };

    // checks if a piece is an enemy
    Piece.prototype.isEnemy = function (piece) {
        return this.color != piece.color;
    };

    Piece.prototype.findAllEnemies = function (boardCells) {
        var enemies = [];
        boardCells.forEach(function (cell) {
            if (cell.piece && cell.piece.color != this.color) {
                enemies.push(cell.piece);
            }
        }.bind(this));

        return enemies;
    };

    // makes sure that a piece's movement will not free a spot for an enemy
    // to attack the king
    Piece.prototype.isSafeToMove = function (boardCells, myKing) {
        var currentCell = this.findCell(boardCells);
        var cellIndex = boardCells.indexOf(currentCell);
        // hypothetically remove the piece and calculate all the enemies' moves
        // to see if the king would be affected
        boardCells[cellIndex].piece = null;

        var enemies = this.findAllEnemies(boardCells);
        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            if (enemy instanceof fChess.BishopPiece ||
                enemy instanceof fChess.RookPiece ||
                enemy instanceof fChess.QueenPiece) {
                    enemy.refreshMoves();
                    enemy.findMoves(boardCells);
                    if (myKing.isChecked) {
                        boardCells[cellIndex].piece = this;
                        myKing.isChecked = false;
                        return false;
                    }
                }
        }

        boardCells[cellIndex].piece = this;
        return true;
    };

    Piece.prototype.findKing = function (boardCells) {
        for (var i = 0; i < boardCells.length; i++) {
            var piece = boardCells[i].piece;
            if (piece &&
                piece.color == this.color &&
                piece instanceof fChess.KingPiece) {
                    return piece;
                }
        }

        return null;
    };

    Piece.prototype.findSouthernMoves = function (currentCell, boardCells, maxStep) {
        var cellIndex = boardCells.indexOf(currentCell);
        var numberOfPossibleMoves = 7 - currentCell.row;
        var limit = Math.min(numberOfPossibleMoves, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex += 8;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    this.availableMoves.push(boardCells[cellIndex]);
                } else {
                    if (!(this instanceof fChess.PawnPiece)) { // a pawn cannot cannot capture its enemy on its path
                        if (this.isEnemy(boardCells[cellIndex].piece)) {
                            boardCells[cellIndex].containEnemy = true;
                            this.availableMoves.push(boardCells[cellIndex]);

                            if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                                boardCells[cellIndex].piece.isChecked = true;
                            }
                        } else {
                            boardCells[cellIndex].containEnemy = false;
                            this.blockedMoves.push(boardCells[cellIndex]);
                        }
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findNorthernMoves = function (currentCell, boardCells, maxStep) {
        var cellIndex = boardCells.indexOf(currentCell);
        var numberOfPossibleMoves = currentCell.row;
        var limit = Math.min(numberOfPossibleMoves, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex -= 8;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    this.availableMoves.push(boardCells[cellIndex]);
                } else {
                    if (!(this instanceof fChess.PawnPiece)) { // a pawn cannot cannot capture its enemy on its path
                        if (this.isEnemy(boardCells[cellIndex].piece)) {
                            boardCells[cellIndex].containEnemy = true;
                            this.availableMoves.push(boardCells[cellIndex]);

                            if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                                boardCells[cellIndex].piece.isChecked = true;
                            }
                        } else {
                            boardCells[cellIndex].containEnemy = false;
                            this.blockedMoves.push(boardCells[cellIndex]);
                        }
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findEasternMoves = function (currentCell, boardCells, maxStep) {
        var cellIndex = boardCells.indexOf(currentCell);
        var numberOfPossibleMoves = 7 - currentCell.column;
        var limit = Math.min(numberOfPossibleMoves, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex++;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    this.availableMoves.push(boardCells[cellIndex]);
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findWesternMoves = function (currentCell, boardCells, maxStep) {
        var cellIndex = boardCells.indexOf(currentCell);
        var numberOfPossibleMoves = currentCell.column;
        var limit = Math.min(numberOfPossibleMoves, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex--;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    this.availableMoves.push(boardCells[cellIndex]);
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findSouthEasternMoves = function (currentCell, boardCells, maxStep) {
        var numberOfDiagonalCells = Math.min(7 - currentCell.row, 7 - currentCell.column);
        var cellIndex = boardCells.indexOf(currentCell);
        var limit = Math.min(numberOfDiagonalCells, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex += 9;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    if (!(this instanceof fChess.PawnPiece)) { // a pawn only gets to move diagonally if there is an enemy
                        this.availableMoves.push(boardCells[cellIndex]);
                    } else {
                        // these moves can be used by a pawn to capture an incoming enemy
                        this.potentialMoves.push(boardCells[cellIndex]);
                        break;
                    }
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findSouthWesternMoves = function (currentCell, boardCells, maxStep) {
        var numberOfDiagonalCells = Math.min(7 - currentCell.row, currentCell.column);
        var cellIndex = boardCells.indexOf(currentCell);
        var limit = Math.min(numberOfDiagonalCells, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex += 7;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    if (!(this instanceof fChess.PawnPiece)) {
                        this.availableMoves.push(boardCells[cellIndex]);
                    } else {
                        this.potentialMoves.push(boardCells[cellIndex]);
                        break;
                    }
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findNorthEasternMoves = function (currentCell, boardCells, maxStep) {
        var numberOfDiagonalCells = Math.min(currentCell.row, 7 - currentCell.column);
        var cellIndex = boardCells.indexOf(currentCell);
        var limit = Math.min(numberOfDiagonalCells, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex -= 7;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    if (!(this instanceof fChess.PawnPiece)) {
                        this.availableMoves.push(boardCells[cellIndex]);
                    } else {
                        this.potentialMoves.push(boardCells[cellIndex]);
                        break;
                    }
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    Piece.prototype.findNorthWesternMoves = function (currentCell, boardCells, maxStep) {
        var numberOfDiagonalCells = Math.min(currentCell.row, currentCell.column);
        var cellIndex = boardCells.indexOf(currentCell);
        var limit = Math.min(numberOfDiagonalCells, maxStep);
        for (var i = 0; i < limit; i++) {
            cellIndex -= 9;
            if (boardCells[cellIndex]) {
                if (boardCells[cellIndex].isEmpty()) {
                    boardCells[cellIndex].containEnemy = false;
                    if (!(this instanceof fChess.PawnPiece)) {
                        this.availableMoves.push(boardCells[cellIndex]);
                    } else {
                        this.potentialMoves.push(boardCells[cellIndex]);
                        break;
                    }
                } else {
                    if (this.isEnemy(boardCells[cellIndex].piece)) {
                        boardCells[cellIndex].containEnemy = true;
                        this.availableMoves.push(boardCells[cellIndex]);

                        if (boardCells[cellIndex].piece instanceof fChess.KingPiece) {
                            boardCells[cellIndex].piece.isChecked = true;
                        }
                    } else {
                        boardCells[cellIndex].containEnemy = false;
                        this.blockedMoves.push(boardCells[cellIndex]);
                    }
                    break;
                }
            }
        }
    };

    return Piece;
})();
