import { Fighter, FloatingText, MatchPhase, Particle } from '../types/game';
import { CANVAS_HEIGHT, CANVAS_WIDTH, GROUND_Y, MOVES_DATA } from './constants';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private sakuraPetals: Particle[] = [];
  private flameTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initSakuraPetals();
  }

  private initSakuraPetals() {
    this.sakuraPetals = [];
    for (let i = 0; i < 35; i++) {
      this.sakuraPetals.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT - 60),
        vx: 0.6 + Math.random() * 1.2,
        vy: 0.4 + Math.random() * 0.8,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? '#fbcfe8' : '#f472b6',
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.05,
        shape: 'petal'
      });
    }
  }

  public render(
    p1: Fighter,
    p2: Fighter,
    refereeState: {
      action: 'idle' | 'hajime' | 'yame' | 'award_p1' | 'award_p2' | 'bow';
      flagP1High: boolean;
      flagP2High: boolean;
      callText: string;
    },
    particles: Particle[],
    floatingTexts: FloatingText[],
    phase: MatchPhase,
    isCrtEnabled: boolean
  ) {
    this.flameTime += 0.05;
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Scenic 16-bit Backdrop (Sunset Mt. Fuji, Pagoda, Torii Gate)
    this.drawBackground();

    // 2. Sakura Petals Drifting in the Wind
    this.updateAndDrawSakura();

    // 3. Central Grandmaster Referee
    this.drawReferee(refereeState);

    // 4. Fighters (P1 White Gi, P2 Red/Crimson Gi)
    this.drawFighter(p1);
    this.drawFighter(p2);

    // 5. Dynamic Hit Sparks, Dust & Explosions
    this.drawParticles(particles);

    // 6. Floating Score Calligraphy & Points (Ippon / Waza-ari)
    this.drawFloatingTexts(floatingTexts);

    // 7. Referee Call Banner on Screen (Hajime / Yame)
    if (refereeState.callText) {
      this.drawRefereeCallBanner(refereeState.callText);
    }
  }

  private drawBackground() {
    const ctx = this.ctx;

    // Sky Gradient - Rich Sunset / Twilight
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGrad.addColorStop(0, '#1e1b4b');   // Deep indigo night sky
    skyGrad.addColorStop(0.35, '#431407'); // Dark sunset ember
    skyGrad.addColorStop(0.65, '#9a3412'); // Warm terracotta
    skyGrad.addColorStop(0.85, '#ea580c'); // Golden flame orange
    skyGrad.addColorStop(1, '#fde047');    // Horizon gold glow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // Distant Sunset Sun Disc
    ctx.save();
    const sunGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.45, 230, 20, CANVAS_WIDTH * 0.45, 230, 95);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.4, '#fb923c');
    sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH * 0.45, 230, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mount Fuji Silhouette with Snowcap
    this.drawMountFuji();

    // Traditional Pagoda Temple & Torii
    this.drawPagodaAndTorii();

    // Courtyard Ground & Tatami/Stone Paving
    this.drawCourtyardGround();

    // Stone Lanterns (Tōrō) with Flickering Fire
    this.drawStoneLantern(80, GROUND_Y - 20);
    this.drawStoneLantern(CANVAS_WIDTH - 80, GROUND_Y - 20);
  }

  private drawMountFuji() {
    const ctx = this.ctx;
    ctx.save();
    const fujiX = CANVAS_WIDTH * 0.46;
    const fujiY = 160;

    // Mountain body
    ctx.fillStyle = '#2e1065';
    ctx.beginPath();
    ctx.moveTo(fujiX - 220, GROUND_Y);
    ctx.lineTo(fujiX - 45, fujiY);
    ctx.lineTo(fujiX + 45, fujiY);
    ctx.lineTo(fujiX + 220, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Snowcap
    ctx.fillStyle = '#fce7f3';
    ctx.beginPath();
    ctx.moveTo(fujiX - 45, fujiY);
    ctx.lineTo(fujiX + 45, fujiY);
    ctx.lineTo(fujiX + 80, fujiY + 65);
    ctx.lineTo(fujiX + 50, fujiY + 55);
    ctx.lineTo(fujiX + 20, fujiY + 70);
    ctx.lineTo(fujiX - 10, fujiY + 55);
    ctx.lineTo(fujiX - 40, fujiY + 68);
    ctx.lineTo(fujiX - 80, fujiY + 65);
    ctx.closePath();
    ctx.fill();

    // Distant mountain ranges
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(0, 310);
    ctx.quadraticCurveTo(CANVAS_WIDTH * 0.2, 260, CANVAS_WIDTH * 0.35, 330);
    ctx.lineTo(CANVAS_WIDTH * 0.35, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH * 0.65, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH * 0.65, 340);
    ctx.quadraticCurveTo(CANVAS_WIDTH * 0.82, 270, CANVAS_WIDTH, 315);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawPagodaAndTorii() {
    const ctx = this.ctx;
    ctx.save();

    // Left Pagoda (Silhouette with eaves)
    const px = 110;
    const py = 200;
    ctx.fillStyle = '#1c1917';

    // Roof tiers
    for (let i = 0; i < 3; i++) {
      const tierY = py + i * 45;
      const w = 110 - i * 16;
      ctx.beginPath();
      ctx.moveTo(px - w, tierY + 20);
      ctx.quadraticCurveTo(px, tierY - 8, px + w, tierY + 20);
      ctx.lineTo(px + w - 10, tierY + 26);
      ctx.quadraticCurveTo(px, tierY + 6, px - w + 10, tierY + 26);
      ctx.closePath();
      ctx.fill();

      // Pillars
      ctx.fillRect(px - w * 0.5, tierY + 26, w, 22);
    }
    // Pagoda finial spire
    ctx.fillRect(px - 3, py - 35, 6, 35);
    ctx.beginPath();
    ctx.arc(px, py - 36, 5, 0, Math.PI * 2);
    ctx.fill();

    // Right Torii Gate
    const tx = CANVAS_WIDTH - 150;
    const ty = 250;
    ctx.fillStyle = '#7f1d1d'; // Crimson wood

    // Top beam (Kasagi)
    ctx.beginPath();
    ctx.moveTo(tx - 65, ty);
    ctx.quadraticCurveTo(tx, ty - 6, tx + 65, ty);
    ctx.lineTo(tx + 60, ty + 12);
    ctx.quadraticCurveTo(tx, ty + 6, tx - 60, ty + 12);
    ctx.closePath();
    ctx.fill();

    // Secondary beam (Nuki)
    ctx.fillRect(tx - 52, ty + 20, 104, 8);

    // Vertical pillars (Hashira)
    ctx.fillRect(tx - 42, ty + 12, 12, GROUND_Y - ty - 12);
    ctx.fillRect(tx + 30, ty + 12, 12, GROUND_Y - ty - 12);

    // Torii Black Bases
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tx - 45, GROUND_Y - 20, 18, 20);
    ctx.fillRect(tx + 27, GROUND_Y - 20, 18, 20);

    // Cherry Blossom Tree silhouette with pink clusters on left
    this.drawSakuraTree(CANVAS_WIDTH - 40, 220);

    ctx.restore();
  }

  private drawSakuraTree(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    // Trunk
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.moveTo(x + 30, GROUND_Y);
    ctx.quadraticCurveTo(x + 10, y + 100, x - 20, y + 50);
    ctx.lineTo(x - 10, y + 45);
    ctx.quadraticCurveTo(x + 25, y + 100, x + 50, GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Foliage clouds
    const clusters = [
      { cx: x - 40, cy: y + 30, r: 45 },
      { cx: x - 10, cy: y - 10, r: 50 },
      { cx: x - 70, cy: y - 5, r: 40 },
      { cx: x + 15, cy: y + 25, r: 35 }
    ];

    clusters.forEach(c => {
      const grad = ctx.createRadialGradient(c.cx, c.cy, 5, c.cx, c.cy, c.r);
      grad.addColorStop(0, '#fbcfe8');
      grad.addColorStop(0.7, '#f472b6');
      grad.addColorStop(1, 'rgba(219, 39, 119, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private drawCourtyardGround() {
    const ctx = this.ctx;
    ctx.save();

    // Stone / Tatami arena base
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    groundGrad.addColorStop(0, '#57534e'); // Stone gray
    groundGrad.addColorStop(0.3, '#44403c');
    groundGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Traditional red lacquered arena borders
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, GROUND_Y - 4, CANVAS_WIDTH, 6);

    // Stone slabs grid lines
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 1.5;
    for (let x = 30; x < CANVAS_WIDTH; x += 65) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 2);
      ctx.lineTo(x - 25, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = GROUND_Y + 25; y < CANVAS_HEIGHT; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Central martial arts circular dojo emblem
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(CANVAS_WIDTH / 2, GROUND_Y + 45, 180, 40, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawStoneLantern(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#44403c';

    // Base & Post
    ctx.fillRect(x - 16, y, 32, 20);
    ctx.fillRect(x - 8, y - 55, 16, 55);

    // Platform
    ctx.fillRect(x - 22, y - 62, 44, 7);

    // Light chamber
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(x - 18, y - 88, 36, 26);

    // Fire glow
    const flicker = Math.sin(this.flameTime * 4 + x) * 2;
    const fireGrad = ctx.createRadialGradient(x, y - 75, 2, x, y - 75, 35);
    fireGrad.addColorStop(0, '#fef08a');
    fireGrad.addColorStop(0.3, '#f97316');
    fireGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(x, y - 75, 32 + flicker, 0, Math.PI * 2);
    ctx.fill();

    // Flame core
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(x, y - 75, 5 + flicker * 0.5, 9 + flicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lantern Roof & Jewel
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.moveTo(x - 28, y - 88);
    ctx.lineTo(x + 28, y - 88);
    ctx.lineTo(x + 18, y - 100);
    ctx.lineTo(x - 18, y - 100);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y - 104, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private updateAndDrawSakura() {
    const ctx = this.ctx;
    ctx.save();
    this.sakuraPetals.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot;
      }

      if (p.x > CANVAS_WIDTH + 20) p.x = -20;
      if (p.y > GROUND_Y - 5) {
        p.y = 10;
        p.x = Math.random() * CANVAS_WIDTH * 0.7;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.rotation) ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // ==========================================
  // Central Referee Grandmaster (Authentic C64)
  // ==========================================

  private drawReferee(ref: {
    action: 'idle' | 'hajime' | 'yame' | 'award_p1' | 'award_p2' | 'bow';
    flagP1High: boolean;
    flagP2High: boolean;
    callText: string;
  }) {
    const ctx = this.ctx;
    const rx = CANVAS_WIDTH / 2;
    const ry = GROUND_Y; // Ground level

    ctx.save();

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bowing posture or standing posture
    const isBowing = ref.action === 'bow';
    const bodyOffsetY = isBowing ? 10 : 0;

    // Hakama / Traditional Robe (Dark Charcoal / Navy)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(rx - 20, ry);
    ctx.lineTo(rx - 12, ry - 65 + bodyOffsetY);
    ctx.lineTo(rx + 12, ry - 65 + bodyOffsetY);
    ctx.lineTo(rx + 20, ry);
    ctx.closePath();
    ctx.fill();

    // White Kimono Top & Black Obi sash
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(rx - 14, ry - 65 + bodyOffsetY);
    ctx.lineTo(rx + 14, ry - 65 + bodyOffsetY);
    ctx.lineTo(rx + 16, ry - 95 + bodyOffsetY);
    ctx.lineTo(rx - 16, ry - 95 + bodyOffsetY);
    ctx.closePath();
    ctx.fill();

    // Black Obi Belt
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(rx - 14, ry - 72 + bodyOffsetY, 28, 8);

    // Kimono collar V-neck
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx - 10, ry - 95 + bodyOffsetY);
    ctx.lineTo(rx, ry - 75 + bodyOffsetY);
    ctx.lineTo(rx + 10, ry - 95 + bodyOffsetY);
    ctx.stroke();

    // Head, Beard & Chonmage topknot
    const headY = ry - 108 + bodyOffsetY;
    ctx.fillStyle = '#fed7aa'; // Skin
    ctx.beginPath();
    ctx.arc(rx, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (wise squint)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(rx - 6, headY - 2, 4, 2);
    ctx.fillRect(rx + 2, headY - 2, 4, 2);

    // Master White Beard & Mustache
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(rx - 8, headY + 3);
    ctx.lineTo(rx + 8, headY + 3);
    ctx.lineTo(rx, headY + 18);
    ctx.closePath();
    ctx.fill();

    // Black Topknot (Chonmage)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(rx - 4, headY - 18, 8, 7);

    // Left Arm (P1 White Flag)
    this.drawRefereeArm(rx - 15, ry - 88 + bodyOffsetY, -1, ref.flagP1High, '#ffffff', '#e2e8f0');

    // Right Arm (P2 Red Flag)
    this.drawRefereeArm(rx + 15, ry - 88 + bodyOffsetY, 1, ref.flagP2High, '#ef4444', '#b91c1c');

    ctx.restore();
  }

  private drawRefereeArm(
    shoulderX: number,
    shoulderY: number,
    side: 1 | -1,
    isRaised: boolean,
    flagColor: string,
    flagBorder: string
  ) {
    const ctx = this.ctx;
    ctx.save();

    const handX = isRaised ? shoulderX + side * 16 : shoulderX + side * 14;
    const handY = isRaised ? shoulderY - 32 : shoulderY + 22;

    // Sleeve
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Hand
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(handX, handY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Flag Stick
    const stickLen = 38;
    const stickAngle = isRaised ? (side > 0 ? -0.4 : -2.7) : (side > 0 ? 1.2 : 1.9);
    const stickEndX = handX + Math.cos(stickAngle) * stickLen;
    const stickEndY = handY + Math.sin(stickAngle) * stickLen;

    ctx.strokeStyle = '#854d0e'; // Bamboo wooden stick
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(stickEndX, stickEndY);
    ctx.stroke();

    // Flag Cloth
    ctx.fillStyle = flagColor;
    ctx.strokeStyle = flagBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stickEndX, stickEndY);
    ctx.lineTo(stickEndX + side * 18, stickEndY - 6);
    ctx.lineTo(stickEndX + side * 14, stickEndY + 16);
    ctx.lineTo(handX + Math.cos(stickAngle) * (stickLen * 0.4), handY + Math.sin(stickAngle) * (stickLen * 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // Karate Fighter Model & Martial Arts Sprites
  // ==========================================

  private drawFighter(f: Fighter) {
    const ctx = this.ctx;
    ctx.save();

    const x = f.x;
    const y = f.y;
    const facing = f.facing; // 1 = right, -1 = left

    // Cast dynamic floor shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    const shadowWidth = f.state === 'CROUCH' ? 52 : (f.state === 'KICK_FLYING' ? 36 : 44);
    const shadowY = GROUND_Y;
    const shadowScale = Math.max(0.4, 1 - (GROUND_Y - y) / 180);
    ctx.beginPath();
    ctx.ellipse(x, shadowY, shadowWidth * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw the fighter's body based on posture / state
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    this.renderMartialPose(f);

    ctx.restore();
    ctx.restore();
  }

  private renderMartialPose(f: Fighter) {
    const ctx = this.ctx;
    const state = f.state;
    const animFrame = f.animFrame;
    const giColor = f.giColor;
    const beltColor = f.beltColor;
    const headbandColor = f.headbandColor;
    const skinColor = '#fed7aa';

    // Sub-renderers for all martial arts moves
    switch (state) {
      case 'IDLE': {
        const bounce = Math.sin(animFrame * 0.12) * 3;
        this.drawKaratekaBody(ctx, 0, bounce, 'idle', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'WALK_FORWARD':
      case 'WALK_BACK': {
        const stride = Math.sin(animFrame * 0.4) * 8;
        this.drawKaratekaBody(ctx, stride, Math.abs(stride * 0.3), 'walk', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'JUMP': {
        this.drawKaratekaBody(ctx, 0, 0, 'jump', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'CROUCH': {
        this.drawKaratekaBody(ctx, 0, 22, 'crouch', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'PUNCH_MID': {
        const extension = Math.min(1, animFrame / 8);
        this.drawKaratekaBody(ctx, 0, 0, 'punch_mid', giColor, beltColor, headbandColor, skinColor, extension);
        break;
      }
      case 'PUNCH_HIGH': {
        const extension = Math.min(1, animFrame / 10);
        this.drawKaratekaBody(ctx, 0, 0, 'punch_high', giColor, beltColor, headbandColor, skinColor, extension);
        break;
      }
      case 'KICK_MID': {
        const extension = Math.min(1, animFrame / 10);
        this.drawKaratekaBody(ctx, 0, 0, 'kick_mid', giColor, beltColor, headbandColor, skinColor, extension);
        break;
      }
      case 'KICK_ROUNDHOUSE': {
        const extension = Math.min(1, animFrame / 12);
        this.drawKaratekaBody(ctx, 0, 0, 'kick_roundhouse', giColor, beltColor, headbandColor, skinColor, extension);
        break;
      }
      case 'KICK_LOW_SWEEP': {
        const extension = Math.min(1, animFrame / 10);
        this.drawKaratekaBody(ctx, 0, 26, 'kick_low_sweep', giColor, beltColor, headbandColor, skinColor, extension);
        break;
      }
      case 'KICK_FLYING': {
        this.drawKaratekaBody(ctx, 0, 0, 'kick_flying', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'BLOCK': {
        this.drawKaratekaBody(ctx, -5, 0, 'block', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'HIT_LIGHT': {
        const recoil = Math.sin(animFrame * 0.3) * 6;
        this.drawKaratekaBody(ctx, -12, recoil, 'hit_light', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'HIT_HEAVY':
      case 'FALL': {
        const fallAngle = Math.min(Math.PI * 0.48, (animFrame / 22) * Math.PI * 0.48);
        ctx.rotate(-fallAngle);
        this.drawKaratekaBody(ctx, -20, 20, 'fall', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'GET_UP': {
        const rise = Math.min(1, animFrame / 20);
        this.drawKaratekaBody(ctx, 0, (1 - rise) * 24, 'crouch', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      case 'BOW': {
        this.drawKaratekaBody(ctx, 0, 10, 'bow', giColor, beltColor, headbandColor, skinColor);
        break;
      }
      default:
        this.drawKaratekaBody(ctx, 0, 0, 'idle', giColor, beltColor, headbandColor, skinColor);
    }
  }

  /**
   * Articulated 16-bit Karateka Model:
   * Accurately reproduces the authentic stance, gi creases, black belt flapping,
   * muscular definition, and classic karate poses.
   */
  private drawKaratekaBody(
    ctx: CanvasRenderingContext2D,
    stride: number,
    bounce: number,
    pose: string,
    giColor: string,
    beltColor: string,
    headbandColor: string,
    skinColor: string,
    extension: number = 1
  ) {
    const hipY = -48 + bounce;
    const chestY = hipY - 26;
    const headY = chestY - 22;

    // Headband flying ribbon in wind
    ctx.strokeStyle = headbandColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, headY - 4);
    ctx.quadraticCurveTo(-18, headY - 8 + Math.sin(this.flameTime * 5) * 4, -28, headY - 2);
    ctx.stroke();

    // 1. Back Leg (drawn first for depth)
    ctx.strokeStyle = giColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (pose === 'idle') {
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-18, hipY + 24);
      ctx.lineTo(-16, 0); // Ground foot
    } else if (pose === 'walk') {
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-14 - stride, hipY + 22);
      ctx.lineTo(-10 - stride, 0);
    } else if (pose === 'crouch') {
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-26, hipY + 16);
      ctx.lineTo(-18, 0);
    } else if (pose === 'kick_mid' || pose === 'kick_roundhouse') {
      // Plant foot
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-12, hipY + 24);
      ctx.lineTo(-10, 0);
    } else if (pose === 'kick_flying') {
      // Tucked back leg
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-18, hipY + 14);
      ctx.lineTo(-6, hipY + 8);
    } else if (pose === 'kick_low_sweep') {
      // Squatting plant leg
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-22, hipY + 14);
      ctx.lineTo(-16, 0);
    } else {
      ctx.moveTo(-5, hipY);
      ctx.lineTo(-16, hipY + 22);
      ctx.lineTo(-12, 0);
    }
    ctx.stroke();

    // Bare foot back
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(pose === 'kick_flying' ? -6 : -14, pose === 'kick_flying' ? hipY + 8 : -2, 5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Torso & Karate Gi Top
    ctx.fillStyle = giColor;
    ctx.beginPath();
    ctx.moveTo(-14, hipY);
    ctx.lineTo(14, hipY);
    ctx.lineTo(16, chestY);
    ctx.lineTo(-14, chestY);
    ctx.closePath();
    ctx.fill();

    // Gi Shading & V-lapel
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, chestY);
    ctx.lineTo(-4, hipY);
    ctx.stroke();

    // Chest musculature / V-neck reveal
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(-4, chestY);
    ctx.lineTo(8, chestY);
    ctx.lineTo(2, chestY + 14);
    ctx.closePath();
    ctx.fill();

    // 3. Black Belt (Obi) with hanging tails
    ctx.fillStyle = beltColor;
    ctx.fillRect(-15, hipY - 6, 30, 8);

    // Flapping belt knot and ties
    ctx.beginPath();
    ctx.moveTo(2, hipY);
    ctx.lineTo(6, hipY + 18 + Math.sin(this.flameTime * 4) * 3);
    ctx.lineTo(2, hipY + 18);
    ctx.lineTo(-2, hipY);
    ctx.closePath();
    ctx.fill();

    // 4. Front Leg
    ctx.strokeStyle = giColor;
    ctx.lineWidth = 14;
    ctx.beginPath();
    if (pose === 'idle') {
      ctx.moveTo(4, hipY);
      ctx.lineTo(14, hipY + 22);
      ctx.lineTo(16, 0);
    } else if (pose === 'walk') {
      ctx.moveTo(4, hipY);
      ctx.lineTo(12 + stride, hipY + 22);
      ctx.lineTo(16 + stride, 0);
    } else if (pose === 'crouch') {
      ctx.moveTo(4, hipY);
      ctx.lineTo(22, hipY + 15);
      ctx.lineTo(14, 0);
    } else if (pose === 'kick_mid') {
      // Front snap kick Mae Geri
      const ext = extension * 58;
      ctx.moveTo(4, hipY);
      ctx.lineTo(18, hipY - 6);
      ctx.lineTo(18 + ext, hipY - 4);
    } else if (pose === 'kick_roundhouse') {
      // High roundhouse kick Mawashi Geri
      const ext = extension * 64;
      ctx.moveTo(4, hipY);
      ctx.lineTo(16, hipY - 14);
      ctx.lineTo(16 + ext, hipY - 26);
    } else if (pose === 'kick_low_sweep') {
      // Low sweep Ashi Barai
      const ext = extension * 62;
      ctx.moveTo(4, hipY);
      ctx.lineTo(16, hipY + 14);
      ctx.lineTo(16 + ext, hipY + 24);
    } else if (pose === 'kick_flying') {
      // Flying kick Tobi Yoko Geri
      ctx.moveTo(4, hipY);
      ctx.lineTo(24, hipY - 10);
      ctx.lineTo(68, hipY - 12);
    } else {
      ctx.moveTo(4, hipY);
      ctx.lineTo(14, hipY + 22);
      ctx.lineTo(16, 0);
    }
    ctx.stroke();

    // Bare foot front
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    if (pose === 'kick_mid') {
      ctx.arc(18 + extension * 58, hipY - 4, 6, 0, Math.PI * 2);
    } else if (pose === 'kick_roundhouse') {
      ctx.arc(16 + extension * 64, hipY - 26, 6, 0, Math.PI * 2);
    } else if (pose === 'kick_low_sweep') {
      ctx.arc(16 + extension * 62, hipY + 24, 6, 0, Math.PI * 2);
    } else if (pose === 'kick_flying') {
      ctx.arc(68, hipY - 12, 6, 0, Math.PI * 2);
    } else {
      ctx.arc(16, -2, 5, 0, Math.PI * 2);
    }
    ctx.fill();

    // 5. Head & Face
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(2, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.fillStyle = headbandColor;
    ctx.fillRect(-9, headY - 8, 22, 6);

    // Determined Martial Eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(4, headY - 2, 4, 2);

    // Short hair
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-9, headY - 12, 18, 5);

    // 6. Arms & Punches
    ctx.strokeStyle = giColor;
    ctx.lineWidth = 11;
    ctx.beginPath();

    if (pose === 'idle') {
      // Guard stance: back hand protecting ribs, lead hand out
      ctx.moveTo(-10, chestY + 4);
      ctx.lineTo(-4, chestY + 16);
      ctx.lineTo(8, chestY + 8);

      ctx.moveTo(10, chestY + 4);
      ctx.lineTo(20, chestY + 10);
      ctx.lineTo(28, chestY - 2);
    } else if (pose === 'punch_mid') {
      // Direct punch Chudan Tsuki
      const pExt = extension * 48;
      // Guard hand chambered at hip
      ctx.moveTo(-10, chestY + 4);
      ctx.lineTo(-12, chestY + 18);
      ctx.lineTo(2, chestY + 20);

      // Punching arm extended
      ctx.moveTo(10, chestY + 6);
      ctx.lineTo(24, chestY + 6);
      ctx.lineTo(14 + pExt, chestY + 6);
    } else if (pose === 'punch_high') {
      // High punch Jodan Tsuki
      const pExt = extension * 52;
      ctx.moveTo(-10, chestY + 4);
      ctx.lineTo(-12, chestY + 18);
      ctx.lineTo(2, chestY + 20);

      // Punching arm raised to head level
      ctx.moveTo(10, chestY + 6);
      ctx.lineTo(22, chestY - 4);
      ctx.lineTo(16 + pExt, chestY - 14);
    } else if (pose === 'block') {
      // Crossed forearm block
      ctx.moveTo(8, chestY + 6);
      ctx.lineTo(16, chestY - 12);
      ctx.lineTo(14, chestY - 24);

      ctx.moveTo(-8, chestY + 6);
      ctx.lineTo(12, chestY - 6);
      ctx.lineTo(18, chestY - 18);
    } else if (pose === 'crouch') {
      ctx.moveTo(-6, chestY + 6);
      ctx.lineTo(10, chestY + 14);
      ctx.lineTo(16, chestY + 6);
    } else if (pose === 'bow') {
      // Hands pressed together in front
      ctx.moveTo(-8, chestY + 6);
      ctx.lineTo(6, chestY + 16);
      ctx.lineTo(12, chestY + 12);
    } else {
      // Default lead arm
      ctx.moveTo(10, chestY + 4);
      ctx.lineTo(20, chestY + 8);
      ctx.lineTo(26, chestY + 2);
    }
    ctx.stroke();

    // Fist / Hands
    ctx.fillStyle = skinColor;
    if (pose === 'punch_mid') {
      ctx.beginPath();
      ctx.arc(14 + extension * 48, chestY + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (pose === 'punch_high') {
      ctx.beginPath();
      ctx.arc(16 + extension * 52, chestY - 14, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (pose === 'block') {
      ctx.beginPath();
      ctx.arc(14, chestY - 24, 5, 0, Math.PI * 2);
      ctx.arc(18, chestY - 18, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(28, chestY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // Visual FX: Hit Sparks, Comic POW, Dust
  // ==========================================

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    ctx.save();

    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        // Star spark for punch impact
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = p.size;
        const innerRadius = p.size * 0.45;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const a = (i * Math.PI) / spikes;
          const sx = Math.cos(a) * r;
          const sy = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        // Circle / dust puff
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    ctx.restore();
  }

  private drawFloatingTexts(texts: FloatingText[]) {
    const ctx = this.ctx;
    ctx.save();

    texts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 32px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(t.text, 0, 0);

      // Fill with vibrant color
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);

      if (t.subText) {
        ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(t.subText, 0, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(t.subText, 0, 30);
      }

      ctx.restore();
    });

    ctx.restore();
  }

  private drawRefereeCallBanner(callText: string) {
    const ctx = this.ctx;
    ctx.save();

    const bannerY = 160;
    // Dark translucent background strip
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, bannerY - 35, CANVAS_WIDTH, 70);

    // Vermilion borders
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, bannerY - 35, CANVAS_WIDTH, 3);
    ctx.fillRect(0, bannerY + 32, CANVAS_WIDTH, 3);

    // Calligraphy call text (Hajime! / Yame! / Ippon!)
    ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(callText, CANVAS_WIDTH / 2, bannerY);

    ctx.fillStyle = '#fef08a';
    ctx.fillText(callText, CANVAS_WIDTH / 2, bannerY);

    ctx.restore();
  }

  // ==========================================
  // Optional "8-bit" post-filter: 320x180 pixels + 16-colour C64-style palette
  // ==========================================

  private static readonly PALETTE: [number, number, number][] = [
    [0x00, 0x00, 0x00], [0xff, 0xff, 0xff], [0x68, 0x37, 0x2b], [0x70, 0xa4, 0xb2],
    [0x6f, 0x3d, 0x86], [0x58, 0x8d, 0x43], [0x35, 0x28, 0x79], [0xb8, 0xc7, 0x6f],
    [0x6f, 0x4f, 0x25], [0x43, 0x39, 0x00], [0x9a, 0x67, 0x59], [0x44, 0x44, 0x44],
    [0x6c, 0x6c, 0x6c], [0x9a, 0xd2, 0x84], [0x6c, 0x5e, 0xb5], [0x95, 0x95, 0x95]
  ];
  private lowRes: HTMLCanvasElement | null = null;
  private lowCtx: CanvasRenderingContext2D | null = null;
  private paletteCache = new Map<number, number>();

  private nearestColor(r: number, g: number, b: number): number {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const cached = this.paletteCache.get(key);
    if (cached !== undefined) return cached;
    let best = 0;
    let bestD = Infinity;
    GameRenderer.PALETTE.forEach(([pr, pg, pb], i) => {
      // weighted distance (eye is more sensitive to green)
      const d = 2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    this.paletteCache.set(key, best);
    return best;
  }

  public applyRetroFilter() {
    const W = 320;
    const H = 180;
    if (!this.lowRes) {
      this.lowRes = document.createElement('canvas');
      this.lowRes.width = W;
      this.lowRes.height = H;
      this.lowCtx = this.lowRes.getContext('2d', { willReadFrequently: true });
    }
    const lc = this.lowCtx;
    if (!lc) return;
    lc.imageSmoothingEnabled = true;
    lc.drawImage(this.ctx.canvas, 0, 0, W, H);
    const img = lc.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = GameRenderer.PALETTE[this.nearestColor(d[i], d[i + 1], d[i + 2])];
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    lc.putImageData(img, 0, 0);
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lowRes, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }
}
