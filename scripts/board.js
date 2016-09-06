var fChess = fChess || {};

fChess.Board = (function () {
    'use strict';

    //constructor
    var Board = function (parentElement) {
        if (parentElement == undefined) {
            parentElement = document.body;
        }
        this.$parent = $(parentElement);

        this.players = [];
        this.spritePieces = [];
        this.spriteCells = [];

        this.game = new Phaser.Game('100%', '100%', Phaser.AUTO, this.$parent.get(0), {
            preload: this.preload.bind(this),
            create: this.create.bind(this),
            update: this.update.bind(this)
        });
    };

    //fields
    Board.prototype.game = null;
    Board.prototype.$parent = null;
    Board.prototype.selectedCell = null;

    Board.prototype.players = null;
    Board.prototype.currentPlayer = null;
    Board.prototype.cells = null;
    Board.prototype.spritePieces = null;
    Board.prototype.spriteCells = null;
    Board.prototype.overlayCells = null;
    Board.prototype.feedbackGraphics = null;
    Board.prototype.firstPlayerPieces = null;
    Board.prototype.secondPlayerPieces = null;

    //functions
    Board.prototype.preload = function () {
        //load all the images
        for (var image in Board.images) {
            this.game.load.image(image, Board.images[image]);
        }
    };

    Board.prototype.create = function () {
        this.game.stage.backgroundColor = '#182d3b';
        var board = this.game.add.sprite(this.game.world.centerX, this.game.world.centerY, 'board');
        board.scale.setTo(Board.gameSettings.widthScale, Board.gameSettings.heightScale);
        board.anchor.set(Board.gameSettings.anchor);

        var style = { font: '65px Arial', fill: '#ff0044', align: 'center' };
        var text = this.game.add.text(150, 50, 'fChess', style);
        text.anchor.set(0.5);

        // create groups
        this.firstPlayerPieces = this.game.add.group();
        this.secondPlayerPieces = this.game.add.group();
        this.overlayCells = this.game.add.group();

        this.initializeCells();
    };

    Board.prototype.update = function () {
        this.render();
    };

    Board.prototype.render = function () {
        this.spritePieces.forEach(function (chessPiece) {
            var cell = this.findCellForPiece(chessPiece.piece);
            if (cell) {
                chessPiece.sprite.x = cell.centerX;
                chessPiece.sprite.y = cell.centerY;
                // bring the piece sprite to the top of other display objects
                chessPiece.sprite.bringToTop();
            }
        }.bind(this));
    };

    Board.prototype.selectPiece = function (piece) {
        this.selectedCell = this.findCellForPiece(piece);
        if (this.selectedCell) {
            if (this.feedbackGraphics && this.feedbackGraphics.alive) {
                this.feedbackGraphics.destroy();
            }

            this.feedbackGraphics = this.game.add.graphics(0, 0);
            this.feedbackGraphics.alive = true;
            this.feedbackGraphics.lineStyle(4, Board.gameSettings.selectedCellColor, 1);
            this.feedbackGraphics.drawRect(this.selectedCell.topLeftX, this.selectedCell.topLeftY, Board.gameSettings.squareWidth, Board.gameSettings.squareHeight);

            // calculate the moves for all the pieces
            if (piece instanceof fChess.KingPiece) {
                piece.calculateMovesWithCaution(this.cells);
            } else {
                piece.calculateMoves(this.cells);
            }

            // draw the possible moves for the piece
            piece.availableMoves.forEach(function (move) {
                if (move.containEnemy) { // if the cell contains an enemy, highlight it red
                    this.feedbackGraphics.lineStyle(4, Board.gameSettings.enemyCellColor, 1);
                    this.feedbackGraphics.drawRect(move.topLeftX, move.topLeftY, Board.gameSettings.squareWidth, Board.gameSettings.squareHeight);
                } else {
                    this.feedbackGraphics.lineStyle(0, 0, 1);
                    this.feedbackGraphics.beginFill(Board.gameSettings.selectedCellColor, 1);
                    this.feedbackGraphics.drawCircle(move.centerX, move.centerY, 15);
                    this.feedbackGraphics.endFill();
                }
            }.bind(this));

            // when a piece is selected, their pieces are brought to the top of display
            // and the enemy pieces are brought behind the overlay cells.
            this.game.world.bringToTop(this.overlayCells);
            if (piece.color == this.players[0].color) {
                this.game.world.bringToTop(this.firstPlayerPieces);
            } else {
                this.game.world.bringToTop(this.secondPlayerPieces);
            }
        }
    };

    Board.prototype.movePiece = function (cellToMove) {
        if (this.selectedCell && (this.selectedCell.piece.availableMoves.indexOf(cellToMove) != -1)) {
            cellToMove.piece = this.selectedCell.piece;
            this.selectedCell.piece = null;
            this.feedbackGraphics.destroy();
        }
    };

    Board.prototype.startNewGame = function () {
        this.clearBoard();
        this.resetPlayers();
        this.initializePieces();
        this.test();
    };

    Board.prototype.clearBoard = function () {
        this.spritePieces.forEach(function (spritePiece) {
            spritePiece.destroy();
        }.bind(this));
        this.spritePieces.length = 0;

        this.cells.forEach(function (cell) {
            cell.piece = null;
        }.bind(this));
    };

    Board.prototype.initializeCells = function () {
        var startingX = this.game.world.centerX - 4 * Board.gameSettings.squareWidth + Board.gameSettings.squareWidth / 2;
        var startingY = this.game.world.centerY - 4 * Board.gameSettings.squareHeight + Board.gameSettings.squareHeight / 2;

        this.cells = [];
        var totalCells = Board.gameSettings.rows * Board.gameSettings.columns;
        for (var i = 0; i < totalCells; i++) {
            var cell = new fChess.Cell();
            cell.row = Math.floor(i / Board.gameSettings.rows);
            cell.column = i % Board.gameSettings.columns;
            cell.centerX = startingX + Board.gameSettings.squareWidth * cell.column;
            cell.centerY = startingY + Board.gameSettings.squareHeight * cell.row;
            cell.topLeftX = this.game.world.centerX - 4 * Board.gameSettings.squareWidth + Board.gameSettings.squareWidth * cell.column;
            cell.topLeftY = this.game.world.centerY - 4 * Board.gameSettings.squareHeight + Board.gameSettings.squareHeight * cell.row;
            this.cells.push(cell);

            // this is an anonymous function that helps restrict the scope of the
            // variables created inside of it.
            (function () {
                var spriteCell = new fChess.SpriteCell(this.game, cell);
                this.game.add.existing(spriteCell.sprite);
                this.spriteCells.push(spriteCell);
                this.overlayCells.add(spriteCell.sprite);

                spriteCell.sprite.events.onInputDown.add(function () {
                    this.movePiece(spriteCell.cell);
                }, this);
            }.bind(this))();
        }
    };

    Board.prototype.initializePieces = function () {
        // since forEach is already a function, all the variables created for each
        // iteration is unique to that iteration.
        this.cells.forEach(function (cell, i) {
            if (cell.piece != null) {
                var spritePiece = new fChess.SpritePiece(this.game, cell.centerX, cell.centerY, cell.piece);
                this.spritePieces.push(spritePiece);
                this.game.add.existing(spritePiece.sprite);

                spritePiece.sprite.events.onInputDown.add(function () {
                    this.selectPiece(spritePiece.piece);
                }, this);
            }
        }.bind(this));

        this.initializePieceGroups();
    };

    Board.prototype.initializePieceGroups = function () {
        // group the sprite pieces for two players
        this.spritePieces.forEach(function (spritePiece) {
            if (spritePiece.piece.color == this.players[0].color) {
                this.firstPlayerPieces.add(spritePiece.sprite);
            } else {
                this.secondPlayerPieces.add(spritePiece.sprite);
            }
        }.bind(this));

        this.game.world.bringToTop(this.firstPlayerPieces);
        this.game.world.bringToTop(this.secondPlayerPieces);
    };

    Board.prototype.calculateMoves = function () {
        this.cells.forEach(function (cell) {
            if (cell.piece) {
                if (cell.piece instanceof fChess.KingPiece) {
                    cell.piece.calculateMovesWithCaution(this.cells);
                } else {
                    cell.piece.calculateMoves(this.cells);
                }
            }
        }.bind(this));
    }

    // just move some pieces around
    Board.prototype.test = function () {
        this.cells[59].piece = null;
        this.cells[27].piece = this.players[1].pieces[3];

        this.cells[0].piece = null;
        this.cells[26].piece = this.players[0].pieces[0];

        this.cells[61].piece = null;
        this.cells[30].piece = this.players[1].pieces[2];

        this.cells[4].piece = null;
        this.cells[25].piece = this.players[0].pieces[4];

        this.cells[1].piece = null;
        this.cells[37].piece = this.players[0].pieces[1];

        this.cells[60].piece = null;
        this.cells[28].piece = this.players[1].pieces[4];

        this.cells[3].piece = null;
        this.cells[43].piece = this.players[0].pieces[3];
    };

    Board.prototype.resetPlayers = function () {
        this.players.push(new fChess.Player('Player 1', 'white'), new fChess.Player('Player 2', 'black'));

        //give players all the starting pieces
        this.players.forEach(function (player) {
            player.pieces.length = 0;

            player.pieces.push(new fChess.RookPiece(player.color));
            player.pieces.push(new fChess.KnightPiece(player.color));
            player.pieces.push(new fChess.BishopPiece(player.color));
            player.pieces.push(new fChess.QueenPiece(player.color));
            player.pieces.push(new fChess.KingPiece(player.color));
            player.pieces.push(new fChess.BishopPiece(player.color));
            player.pieces.push(new fChess.KnightPiece(player.color));
            player.pieces.push(new fChess.RookPiece(player.color));

            for (var i = 0; i < 8; i++) {
                player.pieces.push(new fChess.PawnPiece(player.color));
            }
        }.bind(this));

        // now fill them in with player pieces
        this.players[0].pieces.forEach(function (piece, i) {
            this.cells[i].piece = piece;
        }.bind(this));
        this.players[1].pieces.forEach(function (piece, i) {
            if (piece instanceof fChess.QueenPiece) {
                this.cells[this.cells.length - 5].piece = piece;
            } else if (piece instanceof fChess.KingPiece) {
                this.cells[this.cells.length - 4].piece = piece;
            } else {
                this.cells[this.cells.length - i - 1].piece = piece;
            }
        }.bind(this));
    };

    Board.prototype.findCellForPiece = function (piece) {
        for (var i = 0; i < this.cells.length; i++) {
            if (this.cells[i].piece == piece) {
                return this.cells[i];
            }
        }

        return null;
    };

    //static functions
    Board.getImageNameForPiece = function (piece) {
        var name = '';
        if (piece instanceof fChess.KingPiece) {
            name = piece.color + 'King';
        } else if (piece instanceof fChess.QueenPiece) {
            name = piece.color + 'Queen';
        } else if (piece instanceof fChess.BishopPiece) {
            name = piece.color + 'Bishop';
        } else if (piece instanceof fChess.KnightPiece) {
            name = piece.color + 'Knight';
        } else if (piece instanceof fChess.RookPiece) {
            name = piece.color + 'Rook';
        } else { //pawn
            name = piece.color + 'Pawn';
        }

        return name;
    };

    //static fields
    Board.images = {
        'board': 'assets/board.png',
        'blackKing': 'assets/chesspieces/alpha/bK.png',
        'blackQueen': 'assets/chesspieces/alpha/bQ.png',
        'blackBishop': 'assets/chesspieces/alpha/bB.png',
        'blackRook': 'assets/chesspieces/alpha/bR.png',
        'blackKnight': 'assets/chesspieces/alpha/bN.png',
        'blackPawn': 'assets/chesspieces/alpha/bP.png',
        'whiteKing': 'assets/chesspieces/alpha/wK.png',
        'whiteQueen': 'assets/chesspieces/alpha/wQ.png',
        'whiteBishop': 'assets/chesspieces/alpha/wB.png',
        'whiteRook': 'assets/chesspieces/alpha/wR.png',
        'whiteKnight': 'assets/chesspieces/alpha/wN.png',
        'whitePawn': 'assets/chesspieces/alpha/wP.png'
    };

    Board.gameSettings = {
        rows: 8,
        columns: 8,
        squareWidth: 63,
        squareHeight: 63,
        widthScale: 0.6,
        heightScale: 0.6,
        anchor: 0.5,
        selectedCellColor: 0x0000FF,
        enemyCellColor: 0xFF0000
    };

    return Board;
})();
