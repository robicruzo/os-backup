/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default with dynamic scrolling.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */
var TSOS;
(function (TSOS) {
    class Console {
        currentFont;
        currentFontSize;
        currentXPosition;
        currentYPosition;
        buffer;
        lineEndStack;
        minCanvasHeight = 500; // Minimum canvas height
        lineHeight = 0;
        constructor(currentFont = _DefaultFontFamily, currentFontSize = _DefaultFontSize, currentXPosition = 0, currentYPosition = _DefaultFontSize, buffer = "", lineEndStack = []) {
            this.currentFont = currentFont;
            this.currentFontSize = currentFontSize;
            this.currentXPosition = currentXPosition;
            this.currentYPosition = currentYPosition;
            this.buffer = buffer;
            this.lineEndStack = lineEndStack;
            this.calculateLineHeight();
        }
        calculateLineHeight() {
            this.lineHeight =
                _DefaultFontSize +
                    _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
                    _FontHeightMargin;
        }
        updateCanvasHeight() {
            // Calculate needed height based on current Y position plus some padding
            const neededHeight = this.currentYPosition + this.lineHeight * 3;
            const newHeight = Math.max(this.minCanvasHeight, neededHeight);
            // Only update if we need more space
            if (newHeight > _Canvas.height) {
                // Store current canvas content
                const imageData = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);
                // Resize canvas
                _Canvas.height = newHeight;
                // Restore the content
                _DrawingContext.putImageData(imageData, 0, 0);
                // Auto-scroll to bottom
                this.scrollToBottom();
            }
        }
        scrollToBottom() {
            // Scroll the container to show the bottom
            const container = document.getElementById("divConsole");
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
        init() {
            this.clearScreen();
            this.resetXY();
            // Reset canvas to minimum height
            _Canvas.height = this.minCanvasHeight;
        }
        showBSOD(reason) {
            this.clearScreen();
            this.resetXY();
            const lines = [
                "=== Blue Screen of Death",
                "",
                "*** Hi, I'm the Kernel trying to save you from you.***",
                "An OS error has occured",
                " ",
                "Reason: " + (reason || "Unknown"),
                "",
                "Press the Reset button to restart the system.",
            ];
            for (const line of lines) {
                this.putText(line);
                this.advanceLine();
            }
        }
        clearScreen() {
            _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
        }
        resetXY() {
            this.currentXPosition = 0;
            this.currentYPosition = this.currentFontSize;
        }
        handleBackSpace() {
            if (this.buffer.length === 0)
                return;
            const lastChar = this.buffer[this.buffer.length - 1];
            this.buffer = this.buffer.slice(0, -1);
            const charWidth = _DrawingContext.measureText(this.currentFont, this.currentFontSize, lastChar);
            if (this.currentXPosition - charWidth < 0 &&
                this.lineEndStack.length > 0) {
                this.currentYPosition -= this.lineHeight;
                this.currentXPosition = this.lineEndStack.pop() || 0;
            }
            this.currentXPosition -= charWidth;
            _DrawingContext.clearRect(this.currentXPosition, this.currentYPosition - _DefaultFontSize, charWidth + 1, this.lineHeight);
        }
        handleTab() {
            const typed = this.buffer.trim();
            if (typed.length == 0)
                return;
            const names = _OsShell.commandList.map((c) => c.command);
            const hits = names.filter((n) => n.startsWith(typed));
            if (hits.length === 1) {
                const completion = hits[0];
                const rest = completion.slice(typed.length);
                this.buffer += rest;
                this.putText(rest);
            }
            else if (hits.length > 1) {
                this.advanceLine();
                this.putText(hits.join(" "));
                this.advanceLine();
                this.putText("- " + this.buffer);
            }
            else {
            }
        }
        historyUp() {
            this.recall(-1);
        }
        historyDown() {
            this.recall(+1);
        }
        recall(dir) {
            const recalled = _OsShell.historyPeek(dir);
            if (recalled == null)
                return;
            this.clearLineToPrompt();
            this.buffer = recalled;
            this.putText(this.buffer);
        }
        clearLineToPrompt() {
            while (this.buffer.length > 0) {
                this.handleBackSpace();
            }
        }
        handleInput() {
            while (_KernelInputQueue.getSize() > 0) {
                const chr = _KernelInputQueue.dequeue();
                if (chr === String.fromCharCode(13)) {
                    // Enter
                    _OsShell.historyPush(this.buffer);
                    _OsShell.handleInput(this.buffer);
                    this.buffer = "";
                }
                else if (chr === "[BS]") {
                    this.handleBackSpace();
                }
                else if (chr === "[TAB]") {
                    this.handleTab();
                }
                else if (chr === "[UP]") {
                    this.historyUp();
                }
                else if (chr === "[DOWN]") {
                    this.historyDown();
                }
                else {
                    // Normal printable char
                    this.putText(chr);
                    this.buffer += chr;
                }
            }
        }
        putText(text) {
            if (text === "")
                return;
            for (let i = 0; i < text.length; i++) {
                const ch = text.charAt(i);
                const w = _DrawingContext.measureText(this.currentFont, this.currentFontSize, ch);
                if (this.currentXPosition + w > _Canvas.width) {
                    this.advanceLine();
                }
                _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, ch);
                this.currentXPosition += w;
            }
        }
        advanceLine() {
            this.lineEndStack.push(this.currentXPosition);
            this.currentXPosition = 0;
            this.currentYPosition += this.lineHeight;
            // Check if we need more canvas space and update accordingly
            this.updateCanvasHeight();
        }
    }
    TSOS.Console = Console;
})(TSOS || (TSOS = {}));
//# sourceMappingURL=console.js.map