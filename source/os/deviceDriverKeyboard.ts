/* ----------------------------------
   DeviceDriverKeyboard.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

module TSOS {
  // Extends DeviceDriver
  export class DeviceDriverKeyboard extends DeviceDriver {
    constructor() {
      // Override the base method pointers.

      // The code below cannot run because "this" can only be
      // accessed after calling super.
      // super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
      // So instead...
      super();
      this.driverEntry = this.krnKbdDriverEntry;
      this.isr = this.krnKbdDispatchKeyPress;
    }

    public krnKbdDriverEntry() {
      // Initialization routine for this, the kernel-mode Keyboard Device Driver.
      this.status = "loaded";
      // More?
    }
    //
    public krnKbdDispatchKeyPress(params) {
      const keyCode = params[0];
      const isShifted = params[1];
      _Kernel.krnTrace("Key code:" + keyCode + " shifted:" + isShifted);

      switch (keyCode) {
        case 8:
          _KernelInputQueue.enqueue("[BS]");
          return; // Backspace
        case 9:
          _KernelInputQueue.enqueue("[TAB]");
          return; // Tab
        case 13:
          _KernelInputQueue.enqueue(String.fromCharCode(13));
          return; // Enter
        case 32:
          _KernelInputQueue.enqueue(" ");
          return; // Space
        case 38:
          _KernelInputQueue.enqueue("[UP]");
          return; // Up
        case 40:
          _KernelInputQueue.enqueue("[DOWN]");
          return; // Down
      }

      if (keyCode >= 65 && keyCode <= 90) {
        const chr = String.fromCharCode(isShifted ? keyCode : keyCode + 32);
        _KernelInputQueue.enqueue(chr);
        return;
      }

      const shiftedDigits = ")!@#$%^&*(";
      if (keyCode >= 48 && keyCode <= 57) {
        const chr = isShifted
          ? shiftedDigits[keyCode - 48]
          : String.fromCharCode(keyCode);
        _KernelInputQueue.enqueue(chr);
        return;
      }

      const map = new Map<number, [string, string]>([
        [186, [";", ":"]],
        [187, ["=", "+"]],
        [188, [",", "<"]],
        [189, ["-", "_"]],
        [190, [".", ">"]],
        [191, ["/", "?"]],
        [192, ["`", "~"]],
        [219, ["[", "{"]],
        [220, ["\\", "|"]],
        [221, ["]", "}"]],
        [222, ["'", '"']],
      ]);
      const pair = map.get(keyCode);
      if (pair) {
        _KernelInputQueue.enqueue(isShifted ? pair[1] : pair[0]);
      }
    }
  }
}
