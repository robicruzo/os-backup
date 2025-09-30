/* ------------
     Console.ts

     The OS Console - stdIn and stdOut by default with dynamic scrolling.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

module TSOS {
  export class Console {
    private minCanvasHeight = 500; // minimum canvas height
    private lineHeight = 0;
    private lines: string[] = [""];
    private firstVisibleLine = 0;

    constructor(
      public currentFont = _DefaultFontFamily,
      public currentFontSize = _DefaultFontSize,
      public currentXPosition = 0,
      public currentYPosition = _DefaultFontSize,
      public buffer = "",
    ) {
      this.calculateLineHeight();
    }

    private calculateLineHeight(): void {
      this.lineHeight =
        _DefaultFontSize +
        _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
        _FontHeightMargin;
    }

    private getVisibleLineCapacity(): number {
      return Math.max(1, Math.floor(_Canvas.height / this.lineHeight));
    }

    private measureTextWidth(text: string): number {
      let width = 0;
      for (const ch of text) {
        width += _DrawingContext.measureText(
          this.currentFont,
          this.currentFontSize,
          ch,
        );
      }
      return width;
    }

    private isAtBottom(): boolean {
      const capacity = this.getVisibleLineCapacity();
      const maxFirstLine = Math.max(0, this.lines.length - capacity);
      return this.firstVisibleLine >= maxFirstLine;
    }

    private scrollToLatest(): void {
      const capacity = this.getVisibleLineCapacity();
      this.firstVisibleLine = Math.max(0, this.lines.length - capacity);
      this.syncCaretPosition();
    }

    private syncCaretPosition(): void {
      const capacity = this.getVisibleLineCapacity();
      const currentLineIndex = this.lines.length - 1;
      const visibleOffset = currentLineIndex - this.firstVisibleLine;
      const clampedOffset = Math.max(0, Math.min(visibleOffset, capacity - 1));
      this.currentYPosition =
        this.currentFontSize + clampedOffset * this.lineHeight;
    }

    private redrawVisibleLines(): void {
      _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);

      const capacity = this.getVisibleLineCapacity();
      const endLine = Math.min(
        this.firstVisibleLine + capacity,
        this.lines.length,
      );

      let drawY = this.currentFontSize;
      for (let i = this.firstVisibleLine; i < endLine; i++) {
        const line = this.lines[i];
        if (line.length > 0) {
          _DrawingContext.drawText(
            this.currentFont,
            this.currentFontSize,
            0,
            drawY,
            line,
          );
        }
        drawY += this.lineHeight;
      }

      this.syncCaretPosition();
    }

    public init(): void {
      this.clearScreen();
      this.resetXY();
      // Reset canvas to minimum height
      _Canvas.height = this.minCanvasHeight;
    }

    public showBSOD(reason: string): void {
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

    public clearScreen(): void {
      this.lines = [""];
      this.firstVisibleLine = 0;
      this.currentXPosition = 0;
      this.redrawVisibleLines();
    }

    public resetXY(): void {
      this.currentXPosition = 0;
      this.currentYPosition = this.currentFontSize;
    }

    public handleBackSpace(): void {
      if (this.buffer.length === 0) return;

      const followOutput = this.isAtBottom();

      this.buffer = this.buffer.slice(0, -1);

      // Remove any trailing empty lines that belong to the active input line.
      while (
        this.lines.length > 1 &&
        this.lines[this.lines.length - 1].length === 0
      ) {
        this.lines.pop();
      }

      const lineIndex = this.lines.length - 1;
      const currentLine = this.lines[lineIndex];
      this.lines[lineIndex] = currentLine.slice(0, -1);

      if (this.lines[lineIndex].length === 0 && this.lines.length > 1) {
        this.lines.pop();
      }

      const activeLineIndex = this.lines.length - 1;
      this.currentXPosition = this.measureTextWidth(
        this.lines[activeLineIndex],
      );

      if (followOutput) {
        this.scrollToLatest();
      } else {
        this.syncCaretPosition();
      }
      this.redrawVisibleLines();
    }

    public handleTab() {
      const typed = this.buffer.trim();
      if (typed.length == 0) return;

      const names = _OsShell.commandList.map((c: any) => c.command);
      const hits = names.filter((n: string) => n.startsWith(typed));
      if (hits.length === 1) {
        const completion = hits[0];
        const rest = completion.slice(typed.length);
        this.buffer += rest;
        this.putText(rest);
      } else if (hits.length > 1) {
        this.advanceLine();
        this.putText(hits.join(" "));
        this.advanceLine();
        this.putText("- " + this.buffer);
      } else {
      }
    }

    public historyUp() {
      this.recall(-1);
    }

    public historyDown() {
      this.recall(+1);
    }

    private recall(dir: 1 | -1) {
      const recalled = _OsShell.historyPeek(dir);
      if (recalled == null) return;

      this.clearLineToPrompt();
      this.buffer = recalled;
      this.putText(this.buffer);
    }

    private clearLineToPrompt() {
      while (this.buffer.length > 0) {
        this.handleBackSpace();
      }
    }

    public handleInput(): void {
      while (_KernelInputQueue.getSize() > 0) {
        const chr = _KernelInputQueue.dequeue();

        if (chr === String.fromCharCode(13)) {
          // Enter
          _OsShell.historyPush(this.buffer);
          _OsShell.handleInput(this.buffer);
          this.buffer = "";
        } else if (chr === "[BS]") {
          this.handleBackSpace();
        } else if (chr === "[TAB]") {
          this.handleTab();
        } else if (chr === "[UP]") {
          this.historyUp();
        } else if (chr === "[DOWN]") {
          this.historyDown();
        } else {
          // Normal printable char
          this.putText(chr);
          this.buffer += chr;
        }
      }
    }

    public putText(text: string): void {
      if (text === "") return;

      const followOutput = this.isAtBottom();

      for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        const w = _DrawingContext.measureText(
          this.currentFont,
          this.currentFontSize,
          ch,
        );

        if (this.currentXPosition + w > _Canvas.width) {
          this.advanceLine();
        }

        this.lines[this.lines.length - 1] += ch;
        this.currentXPosition += w;
      }

      if (followOutput) {
        this.scrollToLatest();
      } else {
        this.syncCaretPosition();
      }
      this.redrawVisibleLines();
    }

    public advanceLine(): void {
      const followOutput = this.isAtBottom();

      this.lines.push("");
      this.currentXPosition = 0;

      if (followOutput) {
        this.scrollToLatest();
      } else {
        this.syncCaretPosition();
      }
      this.redrawVisibleLines();
    }

    public scrollDown(pageSize?: number): void {
      const capacity = this.getVisibleLineCapacity();
      if (capacity <= 0) return;

      const step = pageSize != null ? pageSize : capacity;
      if (step <= 0) {
        this.redrawVisibleLines();
        return;
      }

      const maxFirstLine = Math.max(0, this.lines.length - capacity);
      this.firstVisibleLine = Math.min(
        maxFirstLine,
        this.firstVisibleLine + step,
      );
      this.redrawVisibleLines();
    }
  }
}
