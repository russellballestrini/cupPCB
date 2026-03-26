// PCB_REAL -- Real Pocket Cup Box interpreter
// Drop-in replacement for the toy PCB console.
// Preserves pcb.run wrap chain for kernel programs.
// Based on Box language Java source (Scanner, Grouper, KnotRunner).
// Toggle: FORWARD / BACKWARD (not connected) / BOTH (not connected)
// 7-BIT ASCII ONLY
(function () {

  // ----------------------------------------------------------
  // SCANNER -- first pass tokenizer
  // ----------------------------------------------------------
  const TT = {
    // keywords
    TRUE:'TRUE', EURT:'EURT', FALSE:'FALSE', ESLAF:'ESLAF',
    PRINT:'PRINT', TNIRP:'TNIRP',
    RETURN:'RETURN', NRUTER:'NRUTER',
    SAVE:'SAVE', EVAS:'EVAS',
    READ:'READ', DAER:'DAER',
    INTO:'INTO', OTNI:'OTNI',
    RENAME:'RENAME', EMANER:'EMANER',
    TO:'TO', OT:'OT',
    MOVE:'MOVE', EVOM:'EVOM',
    AND:'AND', DNA:'DNA',
    OR:'OR', RO:'RO',
    NOT:'NOT', TON:'TON',
    NULL:'NULL', LLUN:'LLUN',
    NILL:'NILL', LLIN:'LLIN',
    FUN:'FUN', NUF:'NUF',
    RUN:'RUN', NUR:'NUR',
    ADD:'ADD', DDA:'DDA',
    REMOVE:'REMOVE', EVOMER:'EVOMER',
    CLEAR:'CLEAR', RAELC:'RAELC',
    SIZE:'SIZE', EZIS:'EZIS',
    EMPTY:'EMPTY', YTPME:'YTPME',
    PUSH:'PUSH', HSUP:'HSUP',
    POP:'POP',
    SETAT:'SETAT', TATES:'TATES',
    GETAT:'GETAT', TATEG:'TATEG',
    SUB:'SUB', BUS:'BUS',
    LN:'LN', NL:'NL',
    EXP:'EXP', PXE:'PXE',
    SIN:'SIN', NIS:'NIS',
    COS:'COS', SOC:'SOC',
    TAN:'TAN', NAT:'NAT',
    LOG:'LOG', GOL:'GOL',
    CONTAINS:'CONTAINS', SNIATNOC:'SNIATNOC',
    TYPE:'TYPE', EPYT:'EPYT',
    BOX:'BOX', XOB:'XOB',
    CUP:'CUP', PUC:'PUC',
    POCKET:'POCKET', TEKCOP:'TEKCOP',
    KNOT:'KNOT', TONK:'TONK',
    // symbols
    OPENPAREN:'(', CLOSEDPAREN:')',
    OPENBRACE:'{', CLOSEDBRACE:'}',
    OPENSQUARE:'[', CLOSEDSQUARE:']',
    DOT:'.', COMMA:',', SEMICOLON:';',
    PLUS:'+', MINUS:'-', TIMES:'*', POWER:'^',
    FORWARDSLASH:'/', BACKSLASH:'\\',
    BANG:'!', QMARK:'?', AT:'@', HASH:'#',
    EQUALS:'=', EQUALSEQUALS:'==', NOTEQUALS:'!=',
    GREATERTHEN:'>', LESSTHEN:'<',
    GREATERTHENEQUAL:'>=', LESSTHENEQUAL:'<=',
    PLUSPLUS:'++', MINUSMINUS:'--',
    PLUSEQUALS:'+=', MINUSEQUALS:'-=',
    MOD:'%',
    // literals
    IDENTIFIER:'IDENTIFIER',
    INTNUM:'INTNUM',
    DOUBLENUM:'DOUBLENUM',
    STRING:'STRING',
    // whitespace/control
    SPACE:'SPACE', NEWLINE:'NEWLINE', TAB:'TAB',
    EOF:'EOF'
  };

  const KEYWORDS = {
    'true':TT.TRUE,'false':TT.FALSE,
    'eurt':TT.EURT,'eslaf':TT.ESLAF,
    'print':TT.PRINT,'tnirp':TT.TNIRP,
    'return':TT.RETURN,'nruter':TT.NRUTER,
    'save':TT.SAVE,'evas':TT.EVAS,
    'read':TT.READ,'daer':TT.DAER,
    'into':TT.INTO,'otni':TT.OTNI,
    'rename':TT.RENAME,'emaner':TT.EMANER,
    'to':TT.TO,'ot':TT.OT,
    'move':TT.MOVE,'evom':TT.EVOM,
    'and':TT.AND,'dna':TT.DNA,
    'or':TT.OR,'ro':TT.RO,
    'not':TT.NOT,'ton':TT.TON,
    'null':TT.NULL,'NULL':TT.NULL,
    'llun':TT.LLUN,'LLUN':TT.LLUN,
    'nill':TT.NILL,'NILL':TT.NILL,
    'llin':TT.LLIN,'LLIN':TT.LLIN,
    'fun':TT.FUN,'nuf':TT.NUF,
    'run':TT.RUN,'nur':TT.NUR,
    'add':TT.ADD,'dda':TT.DDA,
    'remove':TT.REMOVE,'evomer':TT.EVOMER,
    'clear':TT.CLEAR,'raelc':TT.RAELC,
    'size':TT.SIZE,'ezis':TT.EZIS,
    'empty':TT.EMPTY,'ytpme':TT.YTPME,
    'push':TT.PUSH,'hsup':TT.HSUP,
    'pop':TT.POP,
    'setat':TT.SETAT,'tates':TT.TATES,
    'getat':TT.GETAT,'tateg':TT.TATEG,
    'sub':TT.SUB,'bus':TT.BUS,
    'ln':TT.LN,'nl':TT.NL,
    'exp':TT.EXP,'pxe':TT.PXE,
    'sin':TT.SIN,'nis':TT.NIS,
    'cos':TT.COS,'soc':TT.SOC,
    'tan':TT.TAN,'nat':TT.NAT,
    'log':TT.LOG,'gol':TT.GOL,
    'contains':TT.CONTAINS,'CONTAINS':TT.CONTAINS,
    'sniatnoc':TT.SNIATNOC,'SNIATNOC':TT.SNIATNOC,
    'type':TT.TYPE,'epyt':TT.EPYT,
    'box':TT.BOX,'xob':TT.XOB,
    'cup':TT.CUP,'puc':TT.PUC,
    'knt':TT.POCKET,'pkt':TT.POCKET,
    'pocket':TT.POCKET,'tekcop':TT.TEKCOP,
    'knot':TT.KNOT,'tonk':TT.TONK,
    'tnk':TT.TONK,'tkp':TT.TEKCOP
  };

  function scan(source) {
    const tokens = [];
    let i = 0;

    function peek(offset) {
      return source[i + (offset||0)] || '\0';
    }
    function advance() { return source[i++]; }
    function match(c) {
      if (source[i] === c) { i++; return true; }
      return false;
    }
    function addTok(type, value) {
      tokens.push({ type, value: value !== undefined ? value : null });
    }

    while (i < source.length) {
      const c = advance();
      switch(c) {
        case '(': addTok(TT.OPENPAREN); break;
        case ')': addTok(TT.CLOSEDPAREN); break;
        case '{': addTok(TT.OPENBRACE); break;
        case '}': addTok(TT.CLOSEDBRACE); break;
        case '[': addTok(TT.OPENSQUARE); break;
        case ']': addTok(TT.CLOSEDSQUARE); break;
        case '.': addTok(TT.DOT); break;
        case ',': addTok(TT.COMMA); break;
        case ';': addTok(TT.SEMICOLON); break;
        case '?': addTok(TT.QMARK); break;
        case '@': addTok(TT.AT); break;
        case '#': addTok(TT.HASH); break;
        case '%': addTok(TT.MOD); break;
        case '+': addTok(match('+') ? TT.PLUSPLUS : match('=') ? TT.PLUSEQUALS : TT.PLUS); break;
        case '-': addTok(match('-') ? TT.MINUSMINUS : match('=') ? TT.MINUSEQUALS : TT.MINUS); break;
        case '*': addTok(TT.TIMES); break;
        case '^': addTok(TT.POWER); break;
        case '/':
          if (match('/')) { while (peek() !== '\n' && i < source.length) advance(); }
          else addTok(TT.FORWARDSLASH);
          break;
        case '\\': addTok(TT.BACKSLASH); break;
        case '!': addTok(match('=') ? TT.NOTEQUALS : TT.BANG); break;
        case '=': addTok(match('=') ? TT.EQUALSEQUALS : TT.EQUALS); break;
        case '>': addTok(match('=') ? TT.GREATERTHENEQUAL : TT.GREATERTHEN); break;
        case '<': addTok(match('=') ? TT.LESSTHENEQUAL : TT.LESSTHEN); break;
        case '"': {
          let s = '';
          while (peek() !== '"' && i < source.length) s += advance();
          advance(); // closing "
          addTok(TT.STRING, s);
          break;
        }
        case ' ': case '\r': break; // skip whitespace
        case '\t': break;
        case '\n': addTok(TT.NEWLINE); break;
        default:
          if (c >= '0' && c <= '9') {
            let n = c;
            while (peek() >= '0' && peek() <= '9') n += advance();
            if (peek() === '.') {
              n += advance();
              while (peek() >= '0' && peek() <= '9') n += advance();
              addTok(TT.DOUBLENUM, parseFloat(n));
            } else {
              addTok(TT.INTNUM, parseInt(n));
            }
          } else if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
            let id = c;
            while ((peek() >= 'a' && peek() <= 'z') ||
                   (peek() >= 'A' && peek() <= 'Z') ||
                   (peek() >= '0' && peek() <= '9') ||
                   peek() === '_') id += advance();
            const kw = KEYWORDS[id];
            addTok(kw || TT.IDENTIFIER, id);
          }
      }
    }
    addTok(TT.EOF);
    return tokens;
  }

  // ----------------------------------------------------------
  // REVERSE utility (used throughout like Java source)
  // ----------------------------------------------------------
  function reverse(str) {
    return str.split('').reverse().join('');
  }

  // ----------------------------------------------------------
  // ENVIRONMENT -- variable store
  // ----------------------------------------------------------
  class Environment {
    constructor(parent) {
      this.vars = {};
      this.parent = parent || null;
    }
    define(name, value) { this.vars[name] = value; }
    get(name) {
      if (name in this.vars) return this.vars[name];
      if (this.parent) return this.parent.get(name);
      throw new Error('Undefined variable: ' + name);
    }
    set(name, value) {
      if (name in this.vars) { this.vars[name] = value; return; }
      if (this.parent) { this.parent.set(name, value); return; }
      this.vars[name] = value;
    }
    has(name) {
      if (name in this.vars) return true;
      if (this.parent) return this.parent.has(name);
      return false;
    }
  }

  // ----------------------------------------------------------
  // CONTAINER TYPES -- Pocket, Cup, Box
  // ----------------------------------------------------------
  class PocketInstance {
    constructor() { this.items = []; }
    toString() { return '(' + this.items.join(', ') + ')'; }
  }
  class CupInstance {
    constructor() { this.items = []; }
    toString() { return '{' + this.items.join(', ') + '}'; }
  }
  class BoxInstance {
    constructor() { this.items = []; }
    toString() { return '[' + this.items.join(', ') + ']'; }
  }

  // ----------------------------------------------------------
  // INTERPRETER -- forward execution (BACKWARD toggle exists)
  // ----------------------------------------------------------
  class Interpreter {
    constructor(env, output) {
      this.env = env;
      this.output = output; // function(str)
      this.direction = 'FORWARD'; // FORWARD | BACKWARD | BOTH
      this.store = {}; // save/read store
    }

    run(tokens, direction) {
      if (direction) this.direction = direction;
      // Forward only implemented. Backward/Both toggle exists.
      if (this.direction === 'FORWARD') {
        return this.runForward(tokens);
      } else if (this.direction === 'BACKWARD') {
        // BACKWARD not yet connected -- placeholder
        this.output('[BACKWARD mode not yet implemented]');
        return null;
      } else if (this.direction === 'BOTH') {
        // BOTH not yet connected -- placeholder
        this.output('[BOTH mode not yet implemented]');
        return null;
      }
    }

    runForward(tokens) {
      let i = 0;
      const results = [];

      const peek = () => tokens[i] || { type: TT.EOF };
      const advance = () => tokens[i++];
      const check = (type) => peek().type === type;
      const eat = (type) => {
        if (check(type)) return advance();
        throw new Error('Expected ' + type + ' got ' + peek().type);
      };

      const skipNewlines = () => {
        while (check(TT.NEWLINE)) advance();
      };

      const parseExpr = () => {
        return parseComparison();
      };

      const parseComparison = () => {
        let left = parseAddSub();
        while (check(TT.EQUALSEQUALS) || check(TT.NOTEQUALS) ||
               check(TT.GREATERTHEN) || check(TT.LESSTHEN) ||
               check(TT.GREATERTHENEQUAL) || check(TT.LESSTHENEQUAL)) {
          const op = advance().type;
          const right = parseAddSub();
          if (op === TT.EQUALSEQUALS) left = left === right;
          else if (op === TT.NOTEQUALS) left = left !== right;
          else if (op === TT.GREATERTHEN) left = left > right;
          else if (op === TT.LESSTHEN) left = left < right;
          else if (op === TT.GREATERTHENEQUAL) left = left >= right;
          else if (op === TT.LESSTHENEQUAL) left = left <= right;
        }
        return left;
      };

      const parseAddSub = () => {
        let left = parseMulDiv();
        while (check(TT.PLUS) || check(TT.MINUS)) {
          const op = advance().type;
          const right = parseMulDiv();
          left = op === TT.PLUS ? left + right : left - right;
        }
        return left;
      };

      const parseMulDiv = () => {
        let left = parseUnary();
        while (check(TT.TIMES) || check(TT.FORWARDSLASH) || check(TT.MOD)) {
          const op = advance().type;
          const right = parseUnary();
          if (op === TT.TIMES) left = left * right;
          else if (op === TT.FORWARDSLASH) left = left / right;
          else if (op === TT.MOD) left = left % right;
        }
        return left;
      };

      const parseUnary = () => {
        if (check(TT.MINUS)) { advance(); return -parsePrimary(); }
        if (check(TT.BANG)) { advance(); return !parsePrimary(); }
        return parsePrimary();
      };

      const parsePrimary = () => {
        const tok = peek();

        // string literal
        if (tok.type === TT.STRING) { advance(); return tok.value; }

        // number literals
        if (tok.type === TT.INTNUM || tok.type === TT.DOUBLENUM) {
          advance(); return tok.value;
        }

        // booleans
        if (tok.type === TT.TRUE) { advance(); return true; }
        if (tok.type === TT.FALSE) { advance(); return false; }
        if (tok.type === TT.EURT) { advance(); return true; }
        if (tok.type === TT.ESLAF) { advance(); return false; }

        // null
        if (tok.type === TT.NULL || tok.type === TT.NILL) { advance(); return null; }
        if (tok.type === TT.LLUN || tok.type === TT.LLIN) { advance(); return null; }

        // pocket container ()
        if (tok.type === TT.OPENPAREN) {
          advance();
          const p = new PocketInstance();
          skipNewlines();
          while (!check(TT.CLOSEDPAREN) && !check(TT.EOF)) {
            p.items.push(parseExpr());
            skipNewlines();
            if (check(TT.COMMA)) advance();
            skipNewlines();
          }
          eat(TT.CLOSEDPAREN);
          return p;
        }

        // cup container {}
        if (tok.type === TT.OPENBRACE) {
          advance();
          const c = new CupInstance();
          skipNewlines();
          while (!check(TT.CLOSEDBRACE) && !check(TT.EOF)) {
            c.items.push(parseExpr());
            skipNewlines();
            if (check(TT.COMMA)) advance();
            skipNewlines();
          }
          eat(TT.CLOSEDBRACE);
          return c;
        }

        // box container []
        if (tok.type === TT.OPENSQUARE) {
          advance();
          const b = new BoxInstance();
          skipNewlines();
          while (!check(TT.CLOSEDSQUARE) && !check(TT.EOF)) {
            b.items.push(parseExpr());
            skipNewlines();
            if (check(TT.COMMA)) advance();
            skipNewlines();
          }
          eat(TT.CLOSEDSQUARE);
          return b;
        }

        // math functions
        if (tok.type === TT.SIN || tok.type === TT.NIS) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.sin(v);
        }
        if (tok.type === TT.COS || tok.type === TT.SOC) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.cos(v);
        }
        if (tok.type === TT.TAN || tok.type === TT.NAT) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.tan(v);
        }
        if (tok.type === TT.LOG || tok.type === TT.GOL) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.log10(v);
        }
        if (tok.type === TT.LN || tok.type === TT.NL) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.log(v);
        }
        if (tok.type === TT.EXP || tok.type === TT.PXE) {
          advance(); eat(TT.OPENPAREN);
          const v = parseExpr(); eat(TT.CLOSEDPAREN);
          return Math.exp(v);
        }

        // identifier -- variable read or assignment
        if (tok.type === TT.IDENTIFIER) {
          advance();
          const name = tok.value;
          // dot access for container ops
          if (check(TT.DOT)) {
            advance();
            const op = advance();
            eat(TT.OPENPAREN);
            const arg = check(TT.CLOSEDPAREN) ? null : parseExpr();
            eat(TT.CLOSEDPAREN);
            const container = this.env.has(name) ? this.env.get(name) : null;
            if (container) return this.containerOp(container, op.type, op.value, arg);
          }
          return this.env.has(name) ? this.env.get(name) : name;
        }

        advance();
        return null;
      };

      const parseStatement = () => {
        skipNewlines();
        const tok = peek();

        // print / tnirp
        if (tok.type === TT.PRINT || tok.type === TT.TNIRP) {
          advance();
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const val = parseExpr();
          eat(TT.CLOSEDPAREN);
          this.output(String(val !== null && val !== undefined ? val : 'null'));
          return val;
        }

        // return / nruter
        if (tok.type === TT.RETURN || tok.type === TT.NRUTER) {
          advance();
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const val = parseExpr();
          eat(TT.CLOSEDPAREN);
          results.push(val);
          return val;
        }

        // save / evas
        if (tok.type === TT.SAVE || tok.type === TT.EVAS) {
          advance();
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const key = parseExpr();
          eat(TT.CLOSEDPAREN);
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const val = parseExpr();
          eat(TT.CLOSEDPAREN);
          this.store[String(key)] = val;
          this.output('SAVED: ' + key);
          return val;
        }

        // read / daer
        if (tok.type === TT.READ || tok.type === TT.DAER) {
          advance();
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const key = parseExpr();
          eat(TT.CLOSEDPAREN);
          eat(TT.DOT);
          const intoTok = advance(); // into / otni
          eat(TT.DOT);
          eat(TT.OPENPAREN);
          const varName = advance().value;
          eat(TT.CLOSEDPAREN);
          const val = this.store[String(key)];
          this.env.define(varName, val);
          this.output('READ: ' + key + ' -> ' + varName);
          return val;
        }

        // assignment: identifier = expr
        if (tok.type === TT.IDENTIFIER && tokens[i+1] && tokens[i+1].type === TT.EQUALS) {
          const name = advance().value;
          advance(); // consume =
          const val = parseExpr();
          this.env.define(name, val);
          return val;
        }

        // expression statement
        const val = parseExpr();
        return val;
      };

      // run all statements
      while (!check(TT.EOF)) {
        skipNewlines();
        if (check(TT.EOF)) break;
        try {
          const v = parseStatement();
          if (v !== null && v !== undefined) results.push(v);
        } catch(e) {
          this.output('ERR: ' + e.message);
          break;
        }
        skipNewlines();
        if (check(TT.SEMICOLON)) advance();
      }

      return results;
    }

    containerOp(container, opType, opName, arg) {
      const op = (opName || opType || '').toLowerCase();
      if (op === 'size' || op === 'ezis') return container.items.length;
      if (op === 'empty' || op === 'ytpme') return container.items.length === 0;
      if (op === 'clear' || op === 'raelc') { container.items = []; return null; }
      if (op === 'push' || op === 'hsup') { container.items.unshift(arg); return null; }
      if (op === 'pop') { return container.items.shift(); }
      if (op === 'add' || op === 'dda') { container.items.push(arg); return null; }
      if (op === 'remove' || op === 'evomer') { return container.items.splice(arg, 1)[0]; }
      if (op === 'getat' || op === 'tateg') { return container.items[arg]; }
      if (op === 'contains' || op === 'sniatnoc') { return container.items.includes(arg); }
      return null;
    }
  }

  // ----------------------------------------------------------
  // UI -- replaces toy PCB console section
  // ----------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('pcb-real-styles')) return;
    const s = document.createElement('style');
    s.id = 'pcb-real-styles';
    s.textContent = `
      #pcb-real-section textarea,
      #pcb-real-section pre,
      #pcb-real-section input {
        background: #000;
        color: #ffd700;
        border: 1px solid #333;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        width: 100%;
        box-sizing: border-box;
      }
      #pcb-real-source {
        min-height: 80px;
        resize: vertical;
        padding: 6px;
        outline: none;
      }
      #pcb-real-output {
        min-height: 50px;
        max-height: 120px;
        overflow-y: auto;
        padding: 6px;
        white-space: pre-wrap;
        background: #050505;
        border-top: 1px solid #ffd700;
        margin-top: 4px;
      }
      .pcb-real-toolbar {
        display: flex;
        gap: 4px;
        margin: 5px 0;
        flex-wrap: wrap;
      }
      .pcb-real-btn {
        flex: 1;
        padding: 5px 4px;
        background: #000;
        border: 1px solid #ffd700;
        color: #ffd700;
        font-family: 'Courier New', monospace;
        font-size: 9px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .pcb-real-btn:hover { background: #111; }
      .pcb-real-btn.active { background: #1a1a00; border-color: #ffff00; color: #ffff00; }
      .pcb-real-dir {
        display: flex;
        gap: 3px;
        margin-bottom: 5px;
      }
      .pcb-real-dir-btn {
        flex: 1;
        padding: 4px;
        background: #000;
        border: 1px solid #444;
        color: #666;
        font-family: 'Courier New', monospace;
        font-size: 8px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        text-align: center;
      }
      .pcb-real-dir-btn.selected {
        border-color: #ffd700;
        color: #ffd700;
        background: #0a0a00;
      }
      .pcb-real-dir-btn.disabled-dir {
        opacity: 0.35;
        cursor: not-allowed;
      }
      #pcb-real-status {
        font-size: 9px;
        color: #555;
        margin-top: 3px;
      }
    `;
    document.head.appendChild(s);
  }

  function buildUI() {
    // Remove old PCB console section if present
    const old = document.getElementById('pcb-container');
    if (old) old.style.display = 'none';

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const sec = document.createElement('div');
    sec.className = 'module';
    sec.id = 'pcb-real-section';
    sec.innerHTML =
      '<h3>POCKET CUP BOX CONSOLE</h3>' +

      // direction toggle
      '<div class="pcb-real-dir">' +
        '<div class="pcb-real-dir-btn selected" id="dir-forward">FORWARD</div>' +
        '<div class="pcb-real-dir-btn disabled-dir" id="dir-backward" title="Not yet connected">BACKWARD</div>' +
        '<div class="pcb-real-dir-btn disabled-dir" id="dir-both" title="Not yet connected">BOTH</div>' +
      '</div>' +

      '<textarea id="pcb-real-source" spellcheck="false"' +
        ' placeholder="print.(\'hello\')"></textarea>' +

      '<div class="pcb-real-toolbar">' +
        '<button class="pcb-real-btn" id="pcb-real-run">RUN</button>' +
        '<button class="pcb-real-btn" id="pcb-real-clear-out">CLEAR</button>' +
        '<button class="pcb-real-btn" id="pcb-real-example">EXAMPLE</button>' +
      '</div>' +

      '<pre id="pcb-real-output">PCB READY.</pre>' +
      '<div id="pcb-real-status">DIRECTION: FORWARD</div>';

    sidebar.insertBefore(sec, sidebar.firstChild);
  }

  function wireUI(interp) {
    const src    = document.getElementById('pcb-real-source');
    const out    = document.getElementById('pcb-real-output');
    const status = document.getElementById('pcb-real-status');

    function appendOut(msg) {
      out.textContent += '\n> ' + msg;
      out.scrollTop = out.scrollHeight;
    }

    interp.output = appendOut;

    // direction toggle -- FORWARD connected, BACKWARD/BOTH not connected
    ['forward','backward','both'].forEach(dir => {
      const btn = document.getElementById('dir-' + dir);
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (dir === 'backward' || dir === 'both') {
          appendOut('[' + dir.toUpperCase() + ' mode not yet connected]');
          return;
        }
        document.querySelectorAll('.pcb-real-dir-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        interp.direction = dir.toUpperCase();
        status.textContent = 'DIRECTION: ' + dir.toUpperCase();
      });
    });

    // MANIFEST -- clear pad, spiral source string into manifold
    function manifestASCII(source) {
      // clear draw overlay
      const overlay = document.getElementById('draw-overlay');
      if (overlay) {
        const octx = overlay.getContext('2d');
        octx.clearRect(0, 0, overlay.width, overlay.height);
      }
      // clear seedPoints and manifold
      if (typeof seedPoints !== 'undefined') seedPoints.length = 0;
      if (typeof manifoldMesh !== 'undefined' && manifoldMesh && typeof scene !== 'undefined') {
        scene.remove(manifoldMesh);
      }
      if (!source || source.trim().length === 0) return;
      // ASCII spiral -- charcode mapped to canvas coordinates
      const octx2 = overlay ? overlay.getContext('2d') : null;
      const cx = overlay ? overlay.width / 2 : 100;
      const cy = overlay ? overlay.height / 2 : 100;
      const str = source.trim();
      for (let i = 0; i < str.length; i++) {
        const val = str.charCodeAt(i);
        const angle = i * 0.4;
        const r = (val / 127) * Math.min(cx, cy) * 0.85;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (typeof seedPoints !== 'undefined') seedPoints.push({ x, y });
        if (octx2) {
          octx2.fillStyle = '#000';
          octx2.fillRect(x, y, 2, 2);
        }
      }
      // build manifold from new seed points
      if (typeof buildManifold === 'function' && typeof seedPoints !== 'undefined') {
        buildManifold(seedPoints);
      }
    }

    // HEART -- inject heart curve into manifold
    function manifestHeart() {
      const overlay = document.getElementById('draw-overlay');
      if (!overlay) return;
      const octx = overlay.getContext('2d');
      octx.clearRect(0, 0, overlay.width, overlay.height);
      if (typeof seedPoints !== 'undefined') seedPoints.length = 0;
      const cx = overlay.width / 2;
      const cy = overlay.height / 2;
      const scale = Math.min(overlay.width, overlay.height) * 0.28;
      for (let t = 0; t < Math.PI * 2; t += 0.06) {
        const x = cx + 16 * Math.pow(Math.sin(t), 3) * scale / 17;
        const y = cy - (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * scale / 17;
        if (typeof seedPoints !== 'undefined') seedPoints.push({ x, y });
        octx.fillStyle = '#000';
        octx.fillRect(x, y, 2, 2);
      }
      if (typeof buildManifold === 'function' && typeof seedPoints !== 'undefined') {
        buildManifold(seedPoints);
      }
    }

    document.getElementById('pcb-real-run').addEventListener('click', () => {
      const source = src.value || '';
      if (!source.trim()) return;
      out.textContent = '';
      const trimmed = source.trim();

      // E>.<3 -- heart curve into manifold
      if (trimmed === 'E>.<3') {
        manifestHeart();
        appendOut('E>.<3: heart manifold built');
        status.textContent = 'OK.';
        return;
      }

      // JavaScript eval -- input looks like code (contains = . or ()
      // mirrors toy console REPL behavior
      if (/[=\.\(]/.test(trimmed)) {
        try {
          const result = eval(trimmed);
          if (result !== undefined) appendOut(String(result));
          else appendOut('done');
          status.textContent = 'OK.';
        } catch(e) {
          appendOut('ERR: ' + e.message);
          status.textContent = 'ERROR.';
        }
        manifestASCII(trimmed);
        return;
      }

      // PCB language parse -- everything else
      try {
        const tokens = scan(source);
        const results = interp.run(tokens);
        if (results && results.length > 0) {
          results.forEach(r => {
            if (r !== null && r !== undefined) appendOut(String(r));
          });
        }
        status.textContent = 'OK.';
        manifestASCII(source);
      } catch(e) {
        appendOut('ERR: ' + e.message);
        status.textContent = 'ERROR.';
      }
    });

    document.getElementById('pcb-real-clear-out').addEventListener('click', () => {
      out.textContent = 'PCB READY.';
      status.textContent = 'DIRECTION: ' + interp.direction;
    });

    document.getElementById('pcb-real-example').addEventListener('click', () => {
      src.value = [
        'x = 10',
        'y = 20',
        'print.(x + y)',
        'save.("myval").(x)',
        'read.("myval").into.(z)',
        'print.(z)',
        'p = (1, 2, 3)',
        'print.(p)',
      ].join('\n');
      status.textContent = 'EXAMPLE LOADED.';
    });

    // Wire pcb.run to the real interpreter -- preserves kernel program wrap chain
    if (typeof pcb !== 'undefined') {
      const _origRun = pcb.run.bind(pcb);
      pcb.run = function(source) {
        // Let kernel programs intercept first (fire.js, life.js etc)
        // If we get here the command is for the real PCB interpreter
        try {
          out.textContent = '';
          const tokens = scan(source);
          const results = interp.run(tokens);
          if (results && results.length > 0) {
            results.forEach(r => {
              if (r !== null && r !== undefined) appendOut(String(r));
            });
          }
          status.textContent = 'OK.';
        } catch(e) {
          appendOut('ERR: ' + e.message);
          _origRun(source); // fall back to old interpreter on error
        }
      };
      appendOut('PCB_REAL: console active. kernel chain preserved.');
    }
  }

  // ----------------------------------------------------------
  // BOOT
  // ----------------------------------------------------------
  function boot() {
    injectStyles();
    buildUI();
    const env = new Environment();
    const interp = new Interpreter(env, s => {
      const out = document.getElementById('pcb-real-output');
      if (out) { out.textContent += '\n> ' + s; out.scrollTop = out.scrollHeight; }
    });
    wireUI(interp);
    if (typeof pcb !== 'undefined' && typeof pcb.log === 'function') {
      pcb.log('PGM: PCB_REAL loaded. FORWARD active. BACKWARD/BOTH toggles present.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
