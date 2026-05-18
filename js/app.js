/**
 * 修仙世界 · 太虚之境 — 应用逻辑
 * 东方玄幻修仙网页游戏前端原型
 */
(function () {
    'use strict';

    /* ================================
       游戏状态 — 完整修炼数值体系
       ================================ */
    const GameState = {
        // 修炼路径: 'spirit'=灵修, 'soul'=魂修, 'body'=体修
        cultivationPath: 'spirit',

        player: {
            name: '无名修士',
            realm: '炼气期',
            realmTier: 3,
            realmIndex: 0,
            lifespan: 150,

            // === 核心灵力三维 ===
            SPI: 3,         // 灵力强度
            SPC: 3,         // 灵力掌控
            SPCap: 35,      // 灵力储量上限
            currentQi: 28,  // 当前灵力

            // === 灵魂与肉体 ===
            SS: 8,          // 灵魂强度 (凡人基准=5)
            BS: 12,         // 肉体强度 (凡人基准=5)

            // === 衍生战斗属性 ===
            hp: 200,
            maxHp: 200,
            attack: 15,
            defense: 10,
            combatPower: 0,  // 战斗力（实时计算）

            // === 灵根资质 ===
            spiritRoots: { 金: 72, 木: 45, 水: 88, 火: 60, 土: 35 },

            // === 资源 ===
            spiritStones: 1280,
            stamina: 100,
            maxStamina: 100,
            staminaPerTurn: 10,

            // === 修炼状态 ===
            cultivationProgress: 72,
            cultivationRate: 2.5,
            cultivationTime: 12240,
            isCultivating: false
        },

        enemy: {
            name: '妖兽·赤炎虎',
            realm: '练气期六层',
            SPI: 5, SPC: 4, SPCap: 50, SS: 6, BS: 18,
            hp: 300, maxHp: 300,
            attack: 22, defense: 12
        },

        turn: 1, month: 1, year: 1,
        combatActive: false,
        cultivationInterval: null,
        settings: { particles: true, animations: true }
    };

    // 通用境界体系（灵修）
    const REALMS = [
        { name: '凡体',   tiers: ['肉身'],  lifespan: 90,  spiBase: [0, 1],     spcBase: [0, 1],     spcapBase: [0, 5] },
        { name: '炼气期', tiers: ['一层','二层','三层','四层','五层','六层','七层','八层','九层'], lifespan: 150,  spiBase: [1, 5],   spcBase: [1, 5],   spcapBase: [1, 50] },
        { name: '筑基期', tiers: ['初期','中期','后期','圆满'], lifespan: 200,  spiBase: [10, 50], spcBase: [10, 50], spcapBase: [100, 500] },
        { name: '金丹期', tiers: ['初期','中期','后期','圆满'], lifespan: 500,  spiBase: [100, 500], spcBase: [100, 500], spcapBase: [1000, 5000] },
        { name: '元婴期', tiers: ['初期','中期','后期','圆满'], lifespan: 1000, spiBase: [1000, 5000], spcBase: [1000, 5000], spcapBase: [10000, 50000] },
        { name: '化神期', tiers: ['初期','中期','后期','圆满'], lifespan: 3000, spiBase: [10000, 50000], spcBase: [10000, 50000], spcapBase: [100000, 500000] },
        { name: '炼虚期', tiers: ['初期','中期','后期','圆满'], lifespan: 10000, spiBase: [100000, 500000], spcBase: [100000, 500000], spcapBase: [1e6, 5e6] },
        { name: '合体期', tiers: ['初期','中期','后期','圆满'], lifespan: 30000, spiBase: [1e6, 5e6], spcBase: [1e6, 5e6], spcapBase: [1e7, 5e7] },
        { name: '大乘期', tiers: ['初期','中期','后期','圆满'], lifespan: Infinity, spiBase: [1e7, 5e7], spcBase: [1e7, 5e7], spcapBase: [1e8, 5e8] },
        { name: '渡劫期', tiers: ['初期','中期','后期','圆满'], lifespan: Infinity, spiBase: [1e8, 5e8], spcBase: [1e8, 5e8], spcapBase: [1e9, 5e9] }
    ];

    // 魂修境界
    const SOUL_REALMS = ['凝魂期','铸魂期','魂丹期','魂婴期','化魂期','融虚期','合魂期','魂劫期','渡魂劫'];
    // 体修境界
    const BODY_REALMS = ['锻体期','易筋期','金身期','万象期','神力期','破虚期','不灭期','成圣期','渡体劫'];

    // 功法增幅系数
    const TECHNIQUE_MULTIPLIERS = {
        '黄阶下品': [1.1, 1.1, 1.1], '黄阶中品': [1.2, 1.2, 1.3], '黄阶上品': [1.35, 1.35, 1.5], '黄阶极品': [1.5, 1.5, 2.0],
        '玄阶下品': [1.5, 1.5, 2.0], '玄阶中品': [1.8, 1.8, 2.5], '玄阶上品': [2.1, 2.1, 3.2], '玄阶极品': [2.5, 2.5, 4.0],
        '地阶下品': [3.0, 3.0, 4.0], '地阶中品': [3.5, 3.5, 5.0], '地阶上品': [4.2, 4.2, 6.5], '地阶极品': [5.0, 5.0, 8.0],
        '天阶下品': [6.0, 6.0, 8.0], '天阶中品': [7.0, 7.0, 10.0], '天阶上品': [8.5, 8.5, 13.0], '天阶极品': [10.0, 10.0, 15.0],
        '仙品':    [20.0, 20.0, 30.0]
    };

    // 装备品级操控需求
    const EQUIP_GRADE_REQ = {
        '黄阶下品': { ss: 10,  coeff: 10  }, '黄阶中品': { ss: 15, coeff: 15 }, '黄阶上品': { ss: 20, coeff: 20 }, '黄阶极品': { ss: 25, coeff: 25 },
        '玄阶下品': { ss: 30,  coeff: 30  }, '玄阶中品': { ss: 40, coeff: 40 }, '玄阶上品': { ss: 50, coeff: 50 }, '玄阶极品': { ss: 60, coeff: 60 },
        '地阶下品': { ss: 500, coeff: 500 }, '地阶中品': { ss: 700, coeff: 700 }, '地阶上品': { ss: 900, coeff: 900 }, '地阶极品': { ss: 1000, coeff: 1000 },
        '天阶下品': { ss: 2000, coeff: 2000 }, '天阶中品': { ss: 3000, coeff: 3000 }, '天阶上品': { ss: 4000, coeff: 4000 }, '天阶极品': { ss: 5000, coeff: 5000 },
        '仙品':     { ss: 1e6, coeff: 1e6 }
    };

    /* ================================
       战斗力计算
       ================================ */
    function calcCombatPower(p) {
        const SPI = p.SPI || 1;
        const SPC = p.SPC || 1;
        const SPCap = p.SPCap || 1;
        const SS = p.SS || 5;
        const BS = p.BS || 5;
        // 基础战斗力 = [(SPI + SPC) × log₁₀(SPCap) + SS + BS] × K
        const logCap = Math.log10(Math.max(1, SPCap));
        const base = (SPI + SPC) * logCap + SS + BS;
        const K = 1.0; // 综合修正系数（含装备/技能/状态）
        return Math.round(base * K);
    }

    function updatePlayerCombatPower() {
        GameState.player.combatPower = calcCombatPower(GameState.player);
    }

    /* ================================
       DOM 引用缓存
       ================================ */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        particleCanvas: $('#particleCanvas'),
        appContainer: $('#appContainer'),
        navItems: $$('.nav-item'),
        tabContents: $$('.tab-content'),
        realmName: $('#realmName'),
        realmTier: $('#realmTier'),
        spiritStones: $('#spiritStones').querySelector('.status-value'),
        qiValue: $('#qiValue'),
        staminaValue: $('#staminaValue'),
        staminaDisplay: $('#staminaDisplay'),
        btnNextTurn: $('#btnNextTurn'),
        btnSettings: $('#btnSettings'),
        modalSettings: $('#modalSettings'),

        // Cultivation
        cultTitle: $('#cultTitle'),
        cultDesc: $('#cultDesc'),
        cultPercent: $('#cultPercent'),
        cultProgressBar: $('#cultProgressBar'),
        cultRate: $('#cultRate'),
        cultTime: $('#cultTime'),
        cultBonus: $('#cultBonus'),
        btnCultivate: $('#btnCultivate'),
        btnCultivateText: $('#btnCultivateText'),
        cultVortex: $('#cultVortex'),
        miniQi: $('#miniQi'),
        miniSpirit: $('#miniSpirit'),
        miniBody: $('#miniBody'),

        // Combat
        enemyName: $('#enemyName'),
        enemyRealm: $('#enemyRealm'),
        enemyHpBar: $('#enemyHpBar'),
        enemyHpText: $('#enemyHpText'),
        playerRealm: $('#playerRealm'),
        playerHpBar: $('#playerHpBar'),
        playerHpText: $('#playerHpText'),
        combatLog: $('#combatLog'),
        btnAttack: $('#btnAttack'),
        btnSkill1: $('#btnSkill1'),
        btnSkill2: $('#btnSkill2'),
        btnDefend: $('#btnDefend'),

        // Breakthrough
        btCurRealm: $('#btCurRealm'),
        btCurTier: $('#btCurTier'),
        btNextRealm: $('#btNextRealm'),
        btSuccessRate: $('#btSuccessRate'),
        btnBreakthrough: $('#btnBreakthrough'),
        tribulationGauge: $('#tribulationGauge'),
        modalBtCinematic: $('#modalBreakthroughCinematic'),
        cinematicText: $('#cinematicText'),

        // Modals
        modalItemDetail: $('#modalItemDetail'),
        modalItemTitle: $('#modalItemTitle'),
        modalItemBody: $('#modalItemBody'),
        modalConfirm: $('#modalConfirm'),
        modalConfirmTitle: $('#modalConfirmTitle'),
        modalConfirmBody: $('#modalConfirmBody'),
        btnConfirmCancel: $('#btnConfirmCancel'),
        btnConfirmOk: $('#btnConfirmOk'),

        // LLM
        llmBar: $('#llmBar'),
        llmInput: $('#llmInput'),
        llmHistory: $('#llmHistory'),
        btnLlmSend: $('#btnLlmSend'),
        btnLlmToggle: $('#btnLlmToggle'),
        btnLlmMode: $('#btnLlmMode'),

        // Market
        marketGrid: $('#marketGrid'),
        marketSearch: $('#marketSearch'),
        mktTabs: $$('.mkt-tab'),

        // Inventory
        inventoryGrid: $('#inventoryGrid'),
        equipSlots: $$('.equip-slot'),

        // Settings
        settingParticles: $('#settingParticles'),
        settingAnimations: $('#settingAnimations')
    };

    /* ================================
       粒子背景系统 (Canvas)
       ================================ */
    const ParticleSystem = {
        canvas: DOM.particleCanvas,
        ctx: null,
        particles: [],
        maxParticles: 50,
        animationId: null,

        init() {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.createParticles();
            this.animate();
        },

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },

        createParticles() {
            this.particles = [];
            for (let i = 0; i < this.maxParticles; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.4,
                    speedY: (Math.random() - 0.5) * 0.4 - 0.2,
                    opacity: Math.random() * 0.5 + 0.15,
                    pulseSpeed: Math.random() * 0.02 + 0.01,
                    pulseOffset: Math.random() * Math.PI * 2,
                    hue: Math.random() < 0.15 ? 40 : 220 + Math.random() * 20
                });
            }
        },

        animate() {
            if (!GameState.settings.particles) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.animationId = requestAnimationFrame(() => this.animate());
                return;
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (const p of this.particles) {
                p.x += p.speedX;
                p.y += p.speedY;
                p.pulseOffset += p.pulseSpeed;

                if (p.x < -10) p.x = this.canvas.width + 10;
                if (p.x > this.canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = this.canvas.height + 10;
                if (p.y > this.canvas.height + 10) p.y = -10;

                const alpha = p.opacity + Math.sin(p.pulseOffset) * 0.15;
                const hueStr = p.hue < 60 ? `hsla(${p.hue}, 60%, 65%, ${alpha})` : `hsla(${p.hue}, 50%, 55%, ${alpha})`;

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = hueStr;
                this.ctx.fill();

                if (p.size > 1.2) {
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                    this.ctx.fillStyle = `hsla(${p.hue}, 50%, 50%, ${alpha * 0.12})`;
                    this.ctx.fill();
                }
            }

            this.animationId = requestAnimationFrame(() => this.animate());
        },

        toggle(enabled) {
            GameState.settings.particles = enabled;
            if (!enabled) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    };

    /* ================================
       通知系统
       ================================ */
    const NotificationSystem = {
        container: $('#notificationArea'),
        maxVisible: 4,
        queue: [],
        activeIds: 0,

        show(title, message, type = 'info', duration = 4000) {
            const id = ++this.activeIds;

            if (this.container.children.length >= this.maxVisible) {
                const oldest = this.container.lastElementChild;
                if (oldest) this.remove(oldest);
            }

            const icons = {
                success: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
                warning: '<path d="M12 2L2 22H22L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 10V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18" r="1" fill="currentColor"/>',
                error: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M8 8L16 16M16 8L8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
                info: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path d="M12 8V12M12 16V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
            };

            const notif = document.createElement('div');
            notif.className = `notification ${type}`;
            notif.id = `notif-${id}`;
            notif.style.animationDuration = '350ms';
            notif.innerHTML = `
                <svg class="notif-icon" viewBox="0 0 24 24" fill="none">${icons[type] || icons.info}</svg>
                <div class="notif-content">
                    <div class="notif-title">${title}</div>
                    <div class="notif-message">${message}</div>
                </div>
                <button class="notif-close" aria-label="关闭通知" data-notif-id="${id}">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
                <div class="notif-timer" style="animation-duration:${duration}ms"></div>
            `;

            this.container.insertBefore(notif, this.container.firstChild);

            const closeBtn = notif.querySelector('.notif-close');
            closeBtn.addEventListener('click', () => this.remove(notif));

            const timer = setTimeout(() => this.remove(notif), duration);
            notif._timer = timer;

            return id;
        },

        remove(notif) {
            if (!notif || notif.classList.contains('removing')) return;
            clearTimeout(notif._timer);
            notif.classList.add('removing');
            notif.addEventListener('animationend', () => {
                if (notif.parentNode) notif.parentNode.removeChild(notif);
            }, { once: true });
        },

        success(title, msg, dur) { return this.show(title, msg, 'success', dur); },
        warning(title, msg, dur) { return this.show(title, msg, 'warning', dur); },
        error(title, msg, dur) { return this.show(title, msg, 'error', dur); },
        info(title, msg, dur) { return this.show(title, msg, 'info', dur); }
    };

    /* ================================
       模态框管理
       ================================ */
    const ModalManager = {
        open(modalEl) {
            if (!modalEl) return;
            modalEl.showModal();
            document.body.style.overflow = 'hidden';

            const backdrop = modalEl.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.close(modalEl), { once: true });
            }

            const closeBtn = modalEl.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close(modalEl), { once: true });
            }

            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) this.close(modalEl);
            }, { once: true });

            modalEl.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close(modalEl);
            }, { once: true });
        },

        close(modalEl) {
            if (!modalEl || !modalEl.open) return;
            modalEl.close();
            document.body.style.overflow = '';
        },

        showItemDetail(itemData) {
            DOM.modalItemTitle.textContent = itemData.name;
            DOM.modalItemBody.innerHTML = `
                <div class="modal-item-detail">
                    <div class="modal-item-icon-lg" style="color:${itemData.color || 'var(--gold)'}">
                        ${itemData.icon || ''}
                    </div>
                    <div class="modal-item-info-detail">
                        <h3>${itemData.name}</h3>
                        <span class="item-grade">${itemData.grade || ''}</span>
                        <p class="item-desc">${itemData.desc || '一件修仙界的宝物。'}</p>
                        ${itemData.stats ? `<div class="item-stats">${itemData.stats.map(s => `<span>${s}</span>`).join('')}</div>` : ''}
                    </div>
                </div>
            `;
            this.open(DOM.modalItemDetail);
        },

        showConfirm(title, message, onConfirm) {
            DOM.modalConfirmTitle.textContent = title;
            DOM.modalConfirmBody.innerHTML = `<p style="color:var(--text-secondary);line-height:1.7">${message}</p>`;

            const cleanup = () => {
                DOM.btnConfirmOk.removeEventListener('click', handleConfirm);
                DOM.btnConfirmCancel.removeEventListener('click', handleCancel);
            };

            const handleConfirm = () => {
                cleanup();
                this.close(DOM.modalConfirm);
                if (onConfirm) onConfirm();
            };

            const handleCancel = () => {
                cleanup();
                this.close(DOM.modalConfirm);
            };

            DOM.btnConfirmOk.addEventListener('click', handleConfirm);
            DOM.btnConfirmCancel.addEventListener('click', handleCancel);

            this.open(DOM.modalConfirm);
        }
    };

    /* ================================
       涟漪效果
       ================================ */
    function createRipple(e, el) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        el.style.position = el.style.position || 'relative';
        el.style.overflow = 'hidden';
        el.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }

    /* ================================
       标签页导航
       ================================ */
    function switchTab(tabName) {
        DOM.tabContents.forEach(tc => tc.classList.remove('active'));
        DOM.navItems.forEach(ni => {
            ni.classList.remove('active');
            ni.removeAttribute('aria-current');
        });

        const tabContent = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        const navBtn = document.getElementById(`nav${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);

        if (tabContent) tabContent.classList.add('active');
        if (navBtn) {
            navBtn.classList.add('active');
            navBtn.setAttribute('aria-current', 'page');
        }

        // Re-trigger animation
        if (tabContent) {
            tabContent.style.animation = 'none';
            tabContent.offsetHeight;
            tabContent.style.animation = '';
        }
    }

    DOM.navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            const tab = this.dataset.tab;
            if (tab) switchTab(tab);
            createRipple(e, this);
        });
    });

    /* ================================
       修炼系统
       ================================ */
    function getRealmStatRange() {
        const r = REALMS[GameState.player.realmIndex] || REALMS[1];
        return {
            spiMax: r.spiBase[1], spcMax: r.spcBase[1], spcapMax: r.spcapBase[1],
            ssMax: r.spiBase[1] * 2, bsMax: r.spiBase[1] * 3
        };
    }

    function updateCultivationUI() {
        const p = GameState.player;
        const r = REALMS[p.realmIndex] || REALMS[1];
        const tierName = r.tiers[Math.min(p.realmTier - 1, r.tiers.length - 1)] || '';

        DOM.realmName.textContent = p.realm;
        DOM.realmTier.textContent = tierName;
        DOM.spiritStones.textContent = p.spiritStones.toLocaleString();
        DOM.qiValue.textContent = `${p.currentQi}/${p.SPCap}`;

        // Cultivation progress
        DOM.cultPercent.textContent = `${p.cultivationProgress}%`;
        DOM.cultProgressBar.style.width = `${p.cultivationProgress}%`;
        DOM.cultRate.textContent = `${p.cultivationRate}/秒`;
        const waterGold = (p.spiritRoots.水 + p.spiritRoots.金) / 3;
        DOM.cultBonus.textContent = `+${Math.round(waterGold)}%`;

        const hours = Math.floor(p.cultivationTime / 3600);
        const mins = Math.floor((p.cultivationTime % 3600) / 60);
        DOM.cultTime.textContent = `${hours}时${mins}分`;

        // Qi bar (currentQi / SPCap)
        DOM.miniQi.style.width = SPCap > 0 ? `${(p.currentQi / p.SPCap) * 100}%` : '0%';
        // SPI / SPC bars relative to realm max
        const range = getRealmStatRange();
        DOM.miniSpirit.style.width = `${Math.min(100, (p.SS / range.ssMax) * 100)}%`;
        DOM.miniBody.style.width = `${Math.min(100, (p.BS / range.bsMax) * 100)}%`;

        // Combat display
        DOM.playerRealm.textContent = `${p.realm}${tierName}`;
        DOM.playerHpText.textContent = `${p.hp}/${p.maxHp}`;
        DOM.playerHpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;

        // Breakthrough tab
        DOM.btCurRealm.textContent = p.realm;
        DOM.btCurTier.textContent = tierName;
        const nextIdx = Math.min(p.realmIndex + 1, REALMS.length - 1);
        DOM.btNextRealm.textContent = REALMS[nextIdx]?.name || '渡劫期';
        DOM.btSuccessRate.textContent = `${Math.min(95, 40 + p.cultivationProgress / 2 + (Math.log10(p.SS + 1) + Math.log10(p.BS + 1)) * 4)}%`;

        // Stamina
        DOM.staminaValue.textContent = p.stamina;
        const staminaRatio = p.stamina / p.maxStamina;
        DOM.staminaDisplay.classList.toggle('low-stamina', staminaRatio <= 0.15);

        // Sidebar stats
        setEl('sidebarSPI', p.SPI); setEl('sidebarSPC', p.SPC); setEl('sidebarSPCap', formatLargeNum(p.SPCap));
        setEl('sidebarSS', p.SS); setEl('sidebarBS', p.BS);
        setEl('sidebarCP', formatLargeNum(p.combatPower));

        // Combat power
        updatePlayerCombatPower();

        updateAbodeStats();
    }

    function updateAbodeStats() {
        const p = GameState.player;
        setEl('statHp', p.hp); setEl('statQi', `${p.currentQi}/${p.SPCap}`);
        setEl('statSPI', p.SPI); setEl('statSPC', p.SPC);
        setEl('statSPCap', formatLargeNum(p.SPCap));
        setEl('statSS', p.SS); setEl('statBS', p.BS);
        setEl('statAtk', p.attack); setEl('statDef', p.defense);
        setEl('statCombatPower', formatLargeNum(p.combatPower));
        setEl('statLifespan', p.lifespan === Infinity ? '无尽' : p.lifespan);
        setEl('statPath', pathLabel());
        setEl('invCapacity', '16/24');

        setBar('hpBarStat', p.hp / p.maxHp);
        setBar('qiBarStat', p.currentQi / p.SPCap);
    }

    function setEl(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
    function setBar(id, ratio) {
        const bar = document.getElementById(id);
        if (bar) bar.style.width = `${Math.min(100, ratio * 100)}%`;
    }
    function pathLabel() {
        const map = { spirit: '灵修', soul: '魂修', body: '体修' };
        return map[GameState.cultivationPath] || '灵修';
    }
    function formatLargeNum(n) {
        if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
        if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
        return n.toLocaleString();
    }

    /* ================================
       体力系统
       ================================ */
    function consumeStamina(amount, actionName) {
        const p = GameState.player;
        if (p.stamina < amount) {
            NotificationSystem.warning('体力不足', `体力不足，无法${actionName}。需要 ${amount} 体力，当前仅剩 ${p.stamina} 点。下月将自动回复。`);
            return false;
        }
        p.stamina -= amount;
        updateCultivationUI();

        // Flash the stamina display
        DOM.staminaDisplay.classList.add('stamina-consume-flash');
        DOM.staminaDisplay.addEventListener('animationend', () => {
            DOM.staminaDisplay.classList.remove('stamina-consume-flash');
        }, { once: true });

        return true;
    }

    function advanceTurn() {
        const gs = GameState;
        const p = gs.player;

        // Stop cultivation if active
        if (p.isCultivating) {
            toggleCultivation();
        }

        // Advance time
        gs.turn++;
        gs.month++;
        if (gs.month > 12) {
            gs.month = 1;
            gs.year++;
        }

        // Recover stamina
        const recovered = p.staminaPerTurn;
        p.stamina = Math.min(p.maxStamina, p.stamina + recovered);

        // Natural recovery
        p.hp = Math.min(p.maxHp, Math.round(p.hp + p.maxHp * 0.05));
        p.currentQi = Math.min(p.SPCap, Math.round(p.currentQi + p.SPCap * 0.08));

        // Increment cultivation time
        p.cultivationTime += 3600;

        // Slight passive gains
        if (Math.random() < 0.2) p.SS = Math.round((p.SS || 5) * 1.002);
        if (Math.random() < 0.15) p.BS = Math.round((p.BS || 5) * 1.001);

        updateCultivationUI();
        updateCombatUI();

        const season = gs.month <= 3 ? '春' : gs.month <= 6 ? '夏' : gs.month <= 9 ? '秋' : '冬';
        NotificationSystem.info(
            `第 ${gs.turn} 回合 · ${season}`,
            `修仙历 ${gs.year}年${gs.month}月。体力恢复 +${recovered}（当前 ${p.stamina}/${p.maxStamina}）。`,
            4000
        );
    }

    function toggleCultivation() {
        const p = GameState.player;

        if (p.isCultivating) {
            // 停止修炼
            p.isCultivating = false;
            DOM.cultVortex.classList.remove('cultivating');
            DOM.btnCultivate.classList.remove('active-cultivating');
            DOM.btnCultivateText.textContent = '开始修炼';
            if (GameState.cultivationInterval) {
                clearInterval(GameState.cultivationInterval);
                GameState.cultivationInterval = null;
            }
            DOM.cultDesc.textContent = '吸纳天地灵气，淬炼己身，感悟大道至理。';
            NotificationSystem.info('修炼中止', '你停止了修炼，灵气漩涡逐渐平息。');
        } else {
            // 开始修炼 — 消耗体力
            if (!consumeStamina(15, '开始修炼')) return;
            p.isCultivating = true;
            DOM.cultVortex.classList.add('cultivating');
            DOM.btnCultivate.classList.add('active-cultivating');
            DOM.btnCultivateText.textContent = '停止修炼';
            DOM.cultDesc.textContent = '灵气汇聚于丹田，周身经络运转，天地之力正在淬炼你的肉身...';
            NotificationSystem.success('开始修炼', '你盘膝而坐，引导天地灵气入体。修炼中...');

            GameState.cultivationInterval = setInterval(() => {
                p.cultivationTime += 1;
                p.currentQi = Math.min(p.SPCap, p.currentQi + p.cultivationRate * 0.15);

                const progressGain = p.cultivationRate * 0.008;
                p.cultivationProgress = Math.min(100, p.cultivationProgress + progressGain);

                if (Math.random() < 0.002) {
                    p.SPI = Math.round(p.SPI * 1.001);
                    p.SPC = Math.round(p.SPC * 1.001);
                }

                updateCultivationUI();

                if (p.cultivationProgress >= 100) {
                    p.cultivationProgress = 100;
                    toggleCultivation();
                    NotificationSystem.warning('修炼瓶颈', '当前境界修炼已达圆满，请尽快突破！', 6000);
                }
            }, 1000);
        }
    }

    DOM.btnCultivate.addEventListener('click', (e) => {
        toggleCultivation();
        createRipple(e, DOM.btnCultivate);
    });

    /* ================================
       战斗系统
       ================================ */
    function updateCombatUI() {
        const p = GameState.player;
        const e = GameState.enemy;

        DOM.enemyHpBar.style.width = `${(e.hp / e.maxHp) * 100}%`;
        DOM.enemyHpText.textContent = `${Math.max(0, Math.round(e.hp))}/${e.maxHp}`;
        DOM.playerHpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
        DOM.playerHpText.textContent = `${Math.max(0, Math.round(p.hp))}/${p.maxHp}`;
    }

    function addCombatLog(message, type = 'system') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = message;
        DOM.combatLog.appendChild(entry);
        DOM.combatLog.scrollTop = DOM.combatLog.scrollHeight;
    }

    // 战斗力联动伤害公式: 基础伤害 = [(SPI + SPC) × log₁₀(SPCap) + SS + BS] × K_skill / 防御系数
    function getCombatDamage(attacker, defender, skillMultiplier = 1) {
        const logCap = Math.log10(Math.max(1, attacker.SPCap || 1));
        const rawPower = (attacker.SPI + attacker.SPC) * logCap + (attacker.SS || 5) + (attacker.BS || 5);
        const defFactor = 1 + (defender.BS || 5) * 0.02 + (defender.defense || 0) * 0.01;
        const variance = 0.9 + Math.random() * 0.2;
        return Math.max(3, Math.round(rawPower * skillMultiplier * variance / defFactor));
    }

    function playerAttack(skillName, skillMultiplier, skillColor) {
        if (!GameState.combatActive) return;
        const p = GameState.player;
        const e = GameState.enemy;

        if (p.hp <= 0 || e.hp <= 0) return;

        const dmg = getCombatDamage(p, e, skillMultiplier);
        e.hp = Math.max(0, e.hp - dmg);
        updateCombatUI();

        const critText = dmg > getCombatDamage(p, e, skillMultiplier) * 1.3 ? ' — 会心一击！' : '';
        addCombatLog(`你使出 <span style="color:${skillColor || 'var(--spirit)'}">${skillName}</span>，造成 <span class="highlight">${dmg}</span> 点伤害${critText}`, 'player-action');

        if (e.hp <= 0) {
            endCombat(true);
            return;
        }

        setTimeout(enemyTurn, 800 + Math.random() * 600);
    }

    function enemyTurn() {
        if (!GameState.combatActive) return;
        const p = GameState.player;
        const e = GameState.enemy;

        if (p.hp <= 0 || e.hp <= 0) return;

        const skills = [
            { name: '利爪撕裂', mult: 1, color: 'var(--cinnabar)' },
            { name: '烈焰吐息', mult: 1.5, color: 'var(--flame)' },
            { name: '猛扑', mult: 1.2, color: 'var(--cinnabar)' }
        ];
        const skill = skills[Math.floor(Math.random() * skills.length)];
        const dmg = getCombatDamage(e, p, skill.mult);
        p.hp = Math.max(0, p.hp - dmg);
        updateCombatUI();

        addCombatLog(`<span style="color:var(--cinnabar)">${e.name}</span> 使用 <span style="color:${skill.color}">${skill.name}</span>，对你造成 <span class="highlight">${dmg}</span> 点伤害`, 'enemy-action');

        if (p.hp <= 0) {
            endCombat(false);
        }
    }

    function startCombat() {
        if (GameState.combatActive) return;
        if (!consumeStamina(5, '进入战斗')) return;
        GameState.combatActive = true;

        // Reset enemy
        const e = GameState.enemy;
        e.hp = e.maxHp;

        DOM.combatLog.innerHTML = '';
        updateCombatUI();
        addCombatLog(`战斗开始！你遭遇了 <span class="highlight">${e.name}</span>（${e.realm}）`);
        addCombatLog('妖兽率先发起攻击！', 'system');

        setCombatButtonsEnabled(true);

        setTimeout(enemyTurn, 1200);
        NotificationSystem.warning('进入战斗', `你遭遇了 ${e.name}！准备迎战！`);
    }

    function endCombat(victory) {
        GameState.combatActive = false;
        setCombatButtonsEnabled(false);

        if (victory) {
            addCombatLog('战斗胜利！妖兽化为灵气消散于天地间。', 'victory');
            const reward = 50 + Math.floor(Math.random() * 80);
            GameState.player.spiritStones += reward;
            GameState.player.SS = Math.round((GameState.player.SS || 5) * 1.01);
            updateCultivationUI();
            NotificationSystem.success('战斗胜利', `你击败了 ${GameState.enemy.name}！获得 ${reward} 灵石，灵魂强度微幅提升。`);
        } else {
            addCombatLog('你被击败了...意识逐渐模糊...', 'enemy-action');
            GameState.player.hp = Math.round(GameState.player.maxHp * 0.3);
            updateCultivationUI();
            NotificationSystem.error('战斗失败', '你被妖兽击败，灵力耗尽，修为受损。');
        }
    }

    function setCombatButtonsEnabled(enabled) {
        [DOM.btnAttack, DOM.btnSkill1, DOM.btnSkill2, DOM.btnDefend].forEach(btn => {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.pointerEvents = enabled ? 'auto' : 'none';
        });
    }

    DOM.btnAttack.addEventListener('click', (e) => {
        if (!GameState.combatActive) { startCombat(); return; }
        if (!consumeStamina(8, '普通攻击')) return;
        playerAttack('普通攻击', 1, 'var(--spirit)');
        createRipple(e, DOM.btnAttack);
    });

    DOM.btnSkill1.addEventListener('click', (e) => {
        if (!GameState.combatActive) { startCombat(); return; }
        if (!consumeStamina(10, '使用玄冰咒')) return;
        playerAttack('玄冰咒', 1.8, 'var(--ice)');
        createRipple(e, DOM.btnSkill1);
    });

    DOM.btnSkill2.addEventListener('click', (e) => {
        if (!GameState.combatActive) { startCombat(); return; }
        if (!consumeStamina(12, '使用烈焰掌')) return;
        playerAttack('烈焰掌', 2.0, 'var(--flame)');
        createRipple(e, DOM.btnSkill2);
    });

    DOM.btnDefend.addEventListener('click', (e) => {
        if (!GameState.combatActive) { startCombat(); return; }
        if (!consumeStamina(5, '防御')) return;
        const p = GameState.player;
        const origDef = p.defense;
        p.defense = Math.round(p.defense + (p.BS || 10) * 2);
        addCombatLog('你凝神防御，护体真气流转全身。', 'player-action');
        setTimeout(() => {
            p.defense = origDef;
            addCombatLog('防御状态解除。', 'system');
        }, 3000);
        setTimeout(enemyTurn, 800);
        createRipple(e, DOM.btnDefend);
    });

    // Initialize combat buttons as disabled
    setCombatButtonsEnabled(false);

    /* ================================
       突破系统
       ================================ */
    function triggerBreakthrough() {
        const p = GameState.player;

        if (p.cultivationProgress < 100) {
            NotificationSystem.warning('修为不足', '你需要将修炼进度提升至100%方可尝试突破。');
            return;
        }

        if (!consumeStamina(25, '突破境界')) return;

        if (p.isCultivating) {
            toggleCultivation();
        }

        const successRate = 35 + p.cultivationProgress / 3 + Math.log10(p.SS + p.BS + 1) * 10;
        const success = Math.random() * 100 < successRate;

        // Show cinematic
        DOM.modalBtCinematic.showModal();
        document.body.style.overflow = 'hidden';
        DOM.cinematicText.textContent = '';
        DOM.cinematicText.style.animation = 'none';
        DOM.cinematicText.offsetHeight;

        // Phase 1: 天劫降临
        setTimeout(() => {
            DOM.cinematicText.style.animation = '';
            DOM.cinematicText.textContent = '天劫降临';
            DOM.cinematicText.style.color = '#c9a0f0';
        }, 300);

        // Phase 2: 结果
        setTimeout(() => {
            if (success) {
                DOM.cinematicText.textContent = '突破成功';
                DOM.cinematicText.style.color = 'var(--gold-light)';
                DOM.cinematicText.style.animation = 'none';
                DOM.cinematicText.offsetHeight;
                DOM.cinematicText.style.animation = 'cinematicTextIn 1.5s var(--ease-out-expo)';
            } else {
                DOM.cinematicText.textContent = '渡劫失败';
                DOM.cinematicText.style.color = 'var(--cinnabar)';
                DOM.cinematicText.style.animation = 'none';
                DOM.cinematicText.offsetHeight;
                DOM.cinematicText.style.animation = 'cinematicTextIn 1.5s var(--ease-out-expo)';
            }
        }, 2000);

        // Phase 3: 关闭并处理结果
        setTimeout(() => {
            DOM.modalBtCinematic.close();
            document.body.style.overflow = '';

            if (success) {
                handleBreakthroughSuccess();
            } else {
                handleBreakthroughFailure();
            }
        }, 4000);
    }

    function handleBreakthroughSuccess() {
        const p = GameState.player;
        const prevRealmIdx = p.realmIndex;
        p.realmTier++;

        if (p.realmTier > REALMS[p.realmIndex].tiers.length) {
            p.realmIndex = Math.min(p.realmIndex + 1, REALMS.length - 1);
            p.realmTier = 1;
            p.realm = REALMS[p.realmIndex].name;
            p.lifespan = REALMS[p.realmIndex].lifespan;

            // 跨大境界：属性 ×10（练气→筑基为10倍跃升）
            if (p.realmIndex > prevRealmIdx) {
                p.SPI = Math.round(p.SPI * 10);
                p.SPC = Math.round(p.SPC * 10);
                p.SPCap = Math.round(p.SPCap * 10);
                p.SS = Math.round(p.SS * 8);
                p.BS = Math.round(p.BS * 8);
            }
        }

        // 小境界提升：属性 ×1.3
        p.SPI = Math.round(p.SPI * 1.3);
        p.SPC = Math.round(p.SPC * 1.3);
        p.SPCap = Math.round(p.SPCap * 1.3);
        p.SS = Math.round(p.SS * 1.2);
        p.BS = Math.round(p.BS * 1.2);
        p.cultivationProgress = 0;
        p.maxHp = Math.round(p.maxHp * 1.4);
        p.hp = p.maxHp;
        p.currentQi = p.SPCap;
        p.attack = Math.round(p.attack * 1.3);
        p.defense = Math.round(p.defense * 1.2);

        updateCultivationUI();
        updateCombatUI();

        const realmFull = `${p.realm}${REALMS[p.realmIndex]?.tiers[p.realmTier - 1] || ''}`;
        NotificationSystem.success('境界突破成功！', `你成功突破至 ${realmFull}！灵力三维大幅跃升！寿元 ${p.lifespan === Infinity ? '无尽' : p.lifespan + '年'}。`, 6000);
    }

    function handleBreakthroughFailure() {
        const p = GameState.player;
        p.cultivationProgress = Math.max(0, p.cultivationProgress - 25);
        p.hp = Math.round(p.maxHp * 0.3);
        p.currentQi = Math.round(p.SPCap * 0.4);

        updateCultivationUI();
        updateCombatUI();

        NotificationSystem.error('突破失败', '天劫之力远超预期，突破失败。修为受损，需重新积累。', 6000);
    }

    DOM.btnBreakthrough.addEventListener('click', (e) => {
        createRipple(e, DOM.btnBreakthrough);
        ModalManager.showConfirm(
            '确认突破',
            `你即将尝试突破境界。成功率约为 <span style="color:var(--gold-light);font-weight:600">${DOM.btSuccessRate.textContent}</span>。<br><br>失败将导致修为受损，修炼进度倒退。是否继续？`,
            () => triggerBreakthrough()
        );
    });

    // Close cinematic on click
    DOM.modalBtCinematic.addEventListener('click', () => {
        if (!DOM.modalBtCinematic.open) return;
        DOM.modalBtCinematic.close();
        document.body.style.overflow = '';
    });

    /* ================================
       洞府 / 装备与物品交互
       ================================ */

    // 扩展物品数据
    const itemDataMap = {
        // 装备
        ironSword: {
            name: '青锋剑', grade: '中品法器', category: 'equipment', slot: 'weapon',
            color: 'var(--gold)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><path d="M6 26L16 6L20 10L10 26H6Z" stroke="currentColor" stroke-width="1.2"/><path d="M16 6L24 2L28 8L18 14" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '以玄铁锻造的利剑，剑身泛着幽幽寒光。虽非神兵，却也锋利无匹。',
            stats: ['攻击力 +18', '锋利度：中', '需要修为：炼气期三层']
        },
        cloudBoots: {
            name: '流云靴', grade: '下品法器', category: 'equipment', slot: 'boots',
            color: 'var(--spirit)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><path d="M8 24L16 14L24 24" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            desc: '绘制了轻身符文的靴子，穿上后身轻如燕，步若流云。',
            stats: ['移动速度 +10%', '闪避 +5%', '需要修为：炼气期二层']
        },
        jadeBelt: {
            name: '灵玉腰带', grade: '中品法器', category: 'equipment', slot: 'belt',
            color: 'var(--jade)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="12" width="24" height="6" rx="3" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '镶嵌灵玉的腰带，可储存少量灵力，在关键时刻补充体力。',
            stats: ['最大体力 +20', '灵力上限 +50', '需要修为：炼气期五层']
        },
        // 消耗品
        healPill: {
            name: '回灵丹', grade: '一品丹药', category: 'consumable',
            color: 'var(--jade)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="16" r="6" fill="currentColor" opacity="0.4"/></svg>',
            desc: '修仙界最常见的疗伤丹药，能在短时间内恢复灵力与伤势。',
            stats: ['恢复生命 +200', '恢复灵力 +100', '品质：普通']
        },
        foundationPill: {
            name: '筑基丹', grade: '三品丹药', category: 'consumable',
            color: 'var(--gold)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="20" height="20" rx="4" stroke="currentColor" stroke-width="1.2"/><circle cx="16" cy="16" r="5" fill="currentColor" opacity="0.5"/></svg>',
            desc: '极为珍贵的突破辅助丹药，大幅提升突破至筑基期的成功率。',
            stats: ['突破加成 +25%', '仅限筑基期突破', '品质：稀有']
        },
        qiPill: {
            name: '聚灵丹', grade: '二品丹药', category: 'consumable',
            color: 'var(--spirit)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.2"/><path d="M16 6V16L22 22" stroke="currentColor" stroke-width="1"/></svg>',
            desc: '辅助修炼的丹药，短时间内大幅提升灵力吸收效率。',
            stats: ['修炼效率 +50%', '持续时间：2回合', '品质：普通']
        },
        // 材料
        spiritHerb: {
            name: '灵草', grade: '基础灵材', category: 'material',
            color: 'var(--jade)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><path d="M16 28V12C16 8 20 4 24 4C20 8 20 12 20 12" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '生长于灵气充沛之地的草本植物，是炼丹不可或缺的基础材料。',
            stats: ['药性：温和', '年份：十年', '用途：炼丹主要材料']
        },
        beastCore: {
            name: '妖兽内丹', grade: '稀有材料', category: 'material',
            color: '#c090e0',
            icon: '<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '妖兽修炼凝结的内丹，蕴含妖兽毕生精华。可用于炼制高阶法器。',
            stats: ['品质：二阶妖兽', '灵力含量：高', '用途：炼器、炼丹']
        },
        ironOre: {
            name: '玄铁矿石', grade: '基础材料', category: 'material',
            color: 'var(--text-secondary)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="8" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '产自灵脉深处的矿石，蕴含微量灵气，是锻造法器的优质材料。',
            stats: ['纯度：中等', '灵气含量：低', '用途：锻造法器']
        },
        // 其他
        jadeSlip: {
            name: '神秘玉简', grade: '传承之物', category: 'other',
            color: 'var(--spirit)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><rect x="10" y="4" width="12" height="24" rx="2" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '以灵玉制成的书简，内含前人对道的感悟。以神识探入方可读取其中内容。',
            stats: ['内容：未知', '品质：普通', '使用方式：神识读取']
        },
        spiritStone: {
            name: '灵石', grade: '通用货币', category: 'other',
            color: 'var(--gold)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><polygon points="16,4 24,12 16,20 8,12" stroke="currentColor" stroke-width="1.2"/></polygon></svg>',
            desc: '天地灵气凝结而成的晶石，是修仙界通用的货币。亦可用于修炼与布阵。',
            stats: ['蕴含灵气：微量', '用途：交易、修炼、阵法', '数量：随身携带']
        },
        formationFlag: {
            name: '阵旗', grade: '阵法道具', category: 'other',
            color: 'var(--text-secondary)',
            icon: '<svg viewBox="0 0 32 32" fill="none"><line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="1.2"/><path d="M16 4L26 10L16 16Z" stroke="currentColor" stroke-width="1.2"/></svg>',
            desc: '布置阵法的阵旗，可用来布置简单的防御阵或聚灵阵。',
            stats: ['类型：防御/聚灵', '范围：小', '使用次数：1']
        }
    };

    // 已装备映射
    const equippedItems = {
        weapon: 'ironSword',
        armor: null,
        ring: null,
        helm: null,
        belt: null,
        bracer: null,
        boots: null,
        treasure: null
    };

    // 物品数量追踪
    const inventoryQuantities = {
        ironSword: 1,
        cloudBoots: 1,
        jadeBelt: 1,
        healPill: 8,
        foundationPill: 1,
        qiPill: 5,
        spiritHerb: 15,
        beastCore: 2,
        ironOre: 7,
        jadeSlip: 3,
        spiritStone: 245,
        formationFlag: 4
    };

    function getItemQtyEl(itemKey) {
        return document.querySelector(`#inventoryGrid .inv-item[data-item="${itemKey}"] .item-qty`);
    }

    function updateItemQtyDisplay(itemKey) {
        const qtyEl = getItemQtyEl(itemKey);
        const qty = inventoryQuantities[itemKey] || 0;
        if (qtyEl) {
            qtyEl.textContent = qty > 1 ? `x${qty}` : '';
            if (qty <= 0) qtyEl.textContent = '';
        }
    }

    function decreaseItemQuantity(itemKey) {
        if (!(itemKey in inventoryQuantities)) return;
        inventoryQuantities[itemKey] = Math.max(0, inventoryQuantities[itemKey] - 1);
        updateItemQtyDisplay(itemKey);

        if (inventoryQuantities[itemKey] <= 0) {
            // 从物品栏移除
            const itemEl = document.querySelector(`#inventoryGrid .inv-item[data-item="${itemKey}"]`);
            if (itemEl) {
                itemEl.style.animation = 'notifSlideOut 250ms var(--ease-out-expo) forwards';
                itemEl.addEventListener('animationend', () => itemEl.remove(), { once: true });
            }
            // 如果当前选中的是这个物品，清除详情面板
            if (selectedItemKey === itemKey) {
                selectedItemKey = null;
                DOM_detailPlaceholder.style.display = '';
                DOM_detailContent.style.display = 'none';
            }
        }
    }

    function increaseItemQuantity(itemKey) {
        if (!(itemKey in inventoryQuantities)) {
            inventoryQuantities[itemKey] = 1;
        } else {
            inventoryQuantities[itemKey]++;
        }
        updateItemQtyDisplay(itemKey);

        // 如果物品不在网格中（之前被移除到0了），需要重建
        const existing = document.querySelector(`#inventoryGrid .inv-item[data-item="${itemKey}"]`);
        if (!existing && inventoryQuantities[itemKey] > 0) {
            recreateItemElement(itemKey);
        }
    }

    function recreateItemElement(itemKey) {
        const data = itemDataMap[itemKey];
        if (!data) return;

        const div = document.createElement('div');
        div.className = 'inv-item';
        div.dataset.item = itemKey;
        div.dataset.category = data.category;
        div.style.animation = 'fadeSlideIn 300ms var(--ease-out-expo)';
        div.innerHTML = `
            <div class="item-icon${data.category === 'consumable' ? ' pill' : ''}${data.grade?.includes('稀有') ? ' epic' : ''}${data.category === 'equipment' ? ' weapon-icon' : ''}">
                ${data.icon}
            </div>
            <span class="item-name">${data.name}</span>
            ${data.category === 'equipment' ? `<span class="item-grade-tag">${data.grade}</span>` : ''}
            <span class="item-qty">${inventoryQuantities[itemKey] > 1 ? 'x' + inventoryQuantities[itemKey] : ''}</span>
        `;
        DOM_invGrid.appendChild(div);
    }

    // 纸娃娃槽位初始化（标记已装备的）
    function initPaperdollSlots() {
        // weapon slot is pre-equipped in HTML
        document.querySelectorAll('.paperdoll-slot').forEach(slot => {
            const slotType = slot.dataset.slot;
            slot.addEventListener('click', () => onPaperdollSlotClick(slotType));
        });
    }

    function onPaperdollSlotClick(slotType) {
        const eqKey = equippedItems[slotType];
        if (eqKey && itemDataMap[eqKey]) {
            const data = itemDataMap[eqKey];
            NotificationSystem.info('已装备', `${data.name}（${data.grade}）`);
        } else {
            const slotLabels = {
                weapon: '武器', armor: '衣袍', ring: '戒指', helm: '头冠',
                belt: '腰带', bracer: '护腕', boots: '鞋子', treasure: '法宝'
            };
            NotificationSystem.info('空槽位', `${slotLabels[slotType] || slotType} — 可从物品栏中装备`);
        }
    }

    // 物品栏过滤
    const DOM_invTabs = document.querySelectorAll('#invTabs .inv-tab');
    DOM_invTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            DOM_invTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;
            filterInventoryItems(filter);
        });
    });

    function filterInventoryItems(filter) {
        const items = document.querySelectorAll('#inventoryGrid .inv-item');
        items.forEach(item => {
            if (filter === 'all' || item.dataset.category === filter) {
                item.style.display = '';
                item.style.animation = 'fadeSlideIn 250ms var(--ease-out-expo)';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 物品点击 — 显示详情面板
    const DOM_invGrid = document.getElementById('inventoryGrid');
    const DOM_detailPlaceholder = document.querySelector('.detail-placeholder');
    const DOM_detailContent = document.getElementById('itemDetailContent');
    const DOM_detailIcon = document.getElementById('detailIcon');
    const DOM_detailName = document.getElementById('detailName');
    const DOM_detailGrade = document.getElementById('detailGrade');
    const DOM_detailDesc = document.getElementById('detailDesc');
    const DOM_btnEquipItem = document.getElementById('btnEquipItem');
    const DOM_btnUseItem = document.getElementById('btnUseItem');
    const DOM_btnDropItem = document.getElementById('btnDropItem');

    let selectedItemKey = null;

    DOM_invGrid.addEventListener('click', (e) => {
        const invItem = e.target.closest('.inv-item');
        if (!invItem) return;

        // 选中高亮
        DOM_invGrid.querySelectorAll('.inv-item').forEach(i => i.classList.remove('selected'));
        invItem.classList.add('selected');

        const itemKey = invItem.dataset.item;
        const data = itemDataMap[itemKey];
        if (!data) return;

        selectedItemKey = itemKey;
        showItemDetailPanel(data, itemKey);
    });

    function showItemDetailPanel(data, itemKey) {
        DOM_detailPlaceholder.style.display = 'none';
        DOM_detailContent.style.display = 'flex';
        DOM_detailContent.style.animation = 'fadeSlideIn 250ms var(--ease-out-expo)';

        DOM_detailIcon.innerHTML = data.icon;
        DOM_detailIcon.className = 'detail-icon-wrap';
        if (data.category === 'consumable') DOM_detailIcon.classList.add('consumable-color');
        else if (data.category === 'material') DOM_detailIcon.classList.add('material-color');
        else if (data.category === 'equipment') DOM_detailIcon.classList.add('equipment-color');

        DOM_detailName.textContent = data.name;
        DOM_detailGrade.textContent = `${data.grade} · 剩余 ${inventoryQuantities[itemKey] || 0} 个`;
        DOM_detailDesc.textContent = data.desc
            ? `${data.desc}${data.stats ? ' — ' + data.stats.join(' · ') : ''}`
            : (data.stats ? data.stats.join(' · ') : '');

        // 根据类别显示不同操作按钮
        const isEquipment = data.category === 'equipment';
        const isConsumable = data.category === 'consumable';

        DOM_btnEquipItem.style.display = isEquipment ? '' : 'none';
        DOM_btnEquipItem.textContent = equippedItems[data.slot] === itemKey ? '卸下' : '装备';

        DOM_btnUseItem.style.display = isConsumable ? '' : 'none';
        DOM_btnDropItem.style.display = '';
    }

    // 装备按钮
    DOM_btnEquipItem.addEventListener('click', () => {
        if (!selectedItemKey) return;
        const data = itemDataMap[selectedItemKey];
        if (!data || !data.slot) return;

        const slotEl = document.querySelector(`.paperdoll-slot[data-slot="${data.slot}"]`);
        if (!slotEl) return;

        if (equippedItems[data.slot] === selectedItemKey) {
            // 卸下 — 物品返回物品栏
            const oldKey = equippedItems[data.slot];
            equippedItems[data.slot] = null;
            slotEl.classList.remove('equipped');
            const nameEl = slotEl.querySelector('.pd-slot-name');
            if (nameEl) { nameEl.textContent = '空'; nameEl.classList.add('empty-slot'); }
            DOM_btnEquipItem.textContent = '装备';
            if (oldKey) increaseItemQuantity(oldKey);
            NotificationSystem.info('已卸下', `${data.name} 已放回储物袋。`);
        } else {
            // 若该槽位已有装备，先卸下旧装备
            const oldKey = equippedItems[data.slot];
            if (oldKey) {
                equippedItems[data.slot] = null;
                increaseItemQuantity(oldKey);
            }
            // 装备新物品 — 从物品栏扣除
            equippedItems[data.slot] = selectedItemKey;
            slotEl.classList.add('equipped');
            const nameEl = slotEl.querySelector('.pd-slot-name');
            if (nameEl) { nameEl.textContent = data.name; nameEl.classList.remove('empty-slot'); }
            DOM_btnEquipItem.textContent = '卸下';
            decreaseItemQuantity(selectedItemKey);
            NotificationSystem.success('装备成功', `已装备 ${data.name} 到${slotEl.querySelector('.pd-slot-label')?.textContent || '装备栏'}。`);
        }
    });

    // 使用按钮
    DOM_btnUseItem.addEventListener('click', () => {
        if (!selectedItemKey) return;
        const data = itemDataMap[selectedItemKey];
        if (!data || data.category !== 'consumable') return;

        if (inventoryQuantities[selectedItemKey] <= 0) {
            NotificationSystem.warning('数量不足', `${data.name} 已经用完了。`);
            return;
        }

        const p = GameState.player;
        let used = false;
        if (selectedItemKey === 'healPill') {
            p.hp = Math.min(p.maxHp, p.hp + 200);
            p.currentQi = Math.min(p.SPCap, p.currentQi + 100);
            updateCultivationUI();
            NotificationSystem.success('使用回灵丹', '生命 +200，灵力 +100');
            used = true;
        } else if (selectedItemKey === 'foundationPill') {
            NotificationSystem.info('筑基丹', '此丹药应在突破时使用，当前使用无效。');
        } else if (selectedItemKey === 'qiPill') {
            p.cultivationRate += 6;
            updateCultivationUI();
            NotificationSystem.success('使用聚灵丹', '修炼效率 +50%，持续2回合！');
            used = true;
            setTimeout(() => {
                p.cultivationRate -= 6;
                updateCultivationUI();
                NotificationSystem.info('聚灵丹失效', '修炼效率恢复至正常水平。');
            }, 60000);
        }

        if (used) {
            decreaseItemQuantity(selectedItemKey);
        }
    });

    // 丢弃按钮
    DOM_btnDropItem.addEventListener('click', () => {
        if (!selectedItemKey) return;
        const data = itemDataMap[selectedItemKey];
        const currentQty = inventoryQuantities[selectedItemKey] || 0;
        if (currentQty <= 0) {
            NotificationSystem.warning('数量不足', '此物品已经没有了。');
            return;
        }
        ModalManager.showConfirm('丢弃物品', `确认丢弃 1 个 <span style="color:var(--gold-light)">${data.name}</span> 吗？（剩余 ${currentQty} 个）`, () => {
            decreaseItemQuantity(selectedItemKey);
            NotificationSystem.info('已丢弃', `${data.name} -1（剩余 ${inventoryQuantities[selectedItemKey] || 0} 个）`);
        });
    });

    // 初始化纸娃娃
    initPaperdollSlots();

    /* ================================
       坊市系统
       ================================ */
    DOM.mktTabs.forEach(tab => {
        tab.addEventListener('click', function () {
            DOM.mktTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const category = this.dataset.mkt;
            filterMarketItems(category);
        });
    });

    function filterMarketItems(category) {
        const items = DOM.marketGrid.querySelectorAll('.market-item');
        items.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = '';
                item.style.animation = 'fadeSlideIn 300ms var(--ease-out-expo)';
            } else {
                item.style.display = 'none';
            }
        });
    }

    DOM.marketSearch.addEventListener('input', function () {
        const query = this.value.toLowerCase();
        const items = DOM.marketGrid.querySelectorAll('.market-item');
        items.forEach(item => {
            const name = item.querySelector('h4')?.textContent.toLowerCase() || '';
            const desc = item.querySelector('p')?.textContent.toLowerCase() || '';
            if (name.includes(query) || desc.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 购买按钮
    DOM.marketGrid.addEventListener('click', (e) => {
        const buyBtn = e.target.closest('.btn-buy');
        if (!buyBtn) return;
        const item = buyBtn.closest('.market-item');
        const itemName = item.querySelector('h4')?.textContent || '物品';
        const priceEl = item.querySelector('.mkt-price span');
        const price = priceEl ? parseInt(priceEl.textContent) : 0;

        if (GameState.player.spiritStones >= price) {
            GameState.player.spiritStones -= price;
            updateCultivationUI();
            NotificationSystem.success('购买成功', `你花费 ${price} 灵石购买了 ${itemName}。`);
        } else {
            NotificationSystem.error('灵石不足', `购买 ${itemName} 需要 ${price} 灵石，你的灵石不足。`);
        }
    });

    /* ================================
       功法交互
       ================================ */
    document.getElementById('techniqueGrid').addEventListener('click', (e) => {
        const card = e.target.closest('.tech-card');
        if (!card) return;

        if (card.classList.contains('locked')) {
            NotificationSystem.info('未解锁', '你尚未满足此功法的解锁条件。');
            return;
        }

        const name = card.querySelector('h3')?.textContent || '功法';
        const grade = card.querySelector('.tech-grade')?.textContent || '';
        const desc = card.querySelector('.tech-desc')?.textContent || '';

        NotificationSystem.info(name, `${grade} — ${desc}`);
    });

    /* ================================
       宗门交互
       ================================ */
    document.getElementById('memberList').addEventListener('click', (e) => {
        const member = e.target.closest('.member-item');
        if (!member) return;
        const name = member.querySelector('.member-name')?.textContent || '';
        const role = member.querySelector('.member-role')?.textContent || '';
        NotificationSystem.info(`${name}`, `宗门职位：${role}`);
    });

    document.getElementById('questList').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-quest');
        if (!btn) return;
        const questItem = btn.closest('.quest-item');
        const questName = questItem.querySelector('.quest-name')?.textContent || '';
        btn.textContent = '已接受';
        btn.disabled = true;
        btn.style.opacity = '0.6';
        NotificationSystem.success('任务已接受', `你接受了宗门任务：${questName}`);
    });

    /* ================================
       叙事系统 · 酒馆化交互核心
       ================================ */

    // XML 标签解析器: <thinking> <maintext> <option> <sum> <vars>
    function parseNarrativeResponse(raw) {
        const result = {
            thinking: '',
            maintext: '',
            options: [],
            summary: '',
            vars: {}
        };

        const extractTag = (tag) => {
            const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
            const m = raw.match(re);
            return m ? m[1].trim() : '';
        };

        result.thinking = extractTag('thinking');
        result.maintext = extractTag('maintext');
        result.summary = extractTag('sum');

        const optStr = extractTag('option');
        if (optStr) {
            result.options = optStr.split('\n').map(o => o.trim()).filter(o => o.length > 0);
        }

        const varsStr = extractTag('vars');
        if (varsStr) {
            try { result.vars = JSON.parse(varsStr); } catch (e) { /* ignore */ }
        }

        // Fallback: if no XML tags, treat the whole text as maintext
        if (!result.maintext && !result.thinking && raw.trim()) {
            result.maintext = raw.trim();
        }

        return result;
    }

    // 叙事状态
    const NarrativeState = {
        turn: 0,
        currentScene: '太虚剑宗·石室',
        history: [{ turn: 0, summary: '太虚剑宗·石室苏醒', scene: '石室' }]
    };

    // 叙事 DOM
    const DOM_narrTextWrap = document.getElementById('narrativeTextWrap');
    const DOM_narrOptions = document.getElementById('narrativeOptions');
    const DOM_narrInput = document.getElementById('narrInput');
    const DOM_narrSend = document.getElementById('btnNarrSend');
    const DOM_historyList = document.getElementById('historyList');

    function addNarrativeEntry(sender, text, className = '') {
        const p = GameState.player;
        const timeStr = `修仙历 ${GameState.year}年${GameState.month}月`;

        const entry = document.createElement('div');
        entry.className = `narrative-entry ${className}`;
        entry.innerHTML = `
            <div class="narrate-meta">
                <span class="narrate-label">${sender}</span>
                <span class="narrate-time">${timeStr}</span>
            </div>
            <div class="narrate-body">${text}</div>
        `;
        DOM_narrTextWrap.appendChild(entry);
        DOM_narrTextWrap.scrollTop = DOM_narrTextWrap.scrollHeight;

        // Limit scrollback
        while (DOM_narrTextWrap.children.length > 30) {
            DOM_narrTextWrap.firstElementChild.remove();
        }
    }

    function clearNarrativeOptions() {
        DOM_narrOptions.innerHTML = '';
    }

    function setNarrativeOptions(options) {
        clearNarrativeOptions();
        options.forEach(opt => {
            const text = typeof opt === 'string' ? opt : opt.text;
            const action = typeof opt === 'object' ? opt.action : 'freeInput';
            const btn = document.createElement('button');
            btn.className = 'narr-option';
            btn.dataset.action = action;
            btn.innerHTML = `
                <span class="opt-icon">
                    <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.3"/><path d="M6 10L9 13L14 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <span class="opt-text">${text}</span>
            `;
            btn.addEventListener('click', () => handleOptionClick(text, action));
            DOM_narrOptions.appendChild(btn);
        });
    }

    function addHistoryEntry(summary) {
        NarrativeState.turn++;
        NarrativeState.history.push({ turn: NarrativeState.turn, summary, scene: NarrativeState.currentScene });

        // Update sidebar
        DOM_historyList.querySelectorAll('.history-item').forEach(h => h.classList.remove('active'));
        const item = document.createElement('div');
        item.className = 'history-item active';
        item.dataset.turn = NarrativeState.turn;
        item.innerHTML = `<span class="hi-turn">第${NarrativeState.turn}回</span><span class="hi-summary">${summary}</span>`;
        DOM_historyList.appendChild(item);
        item.scrollIntoView({ behavior: 'smooth' });
    }

    function handleOptionClick(text, action) {
        if (!consumeStamina(1, '行动')) return;
        addNarrativeEntry('你', `<p>${text}</p>`, 'player-narrate');
        clearNarrativeOptions();
        NarrativeState.currentScene = text.substring(0, 20);
        addHistoryEntry(text.substring(0, 15));

        // Generate response
        setTimeout(() => processNarrativeAction(text, action), 500);
    }

    function processNarrativeAction(text, action) {
        const response = generateStructuredResponse(text, action);
        const parsed = parseNarrativeResponse(response.raw);

        // Show maintext
        if (parsed.maintext) {
            const paragraphs = parsed.maintext.split('\n\n').filter(p => p.trim());
            const html = paragraphs.map(p => `<p>${p}</p>`).join('');
            addNarrativeEntry('系统', html, 'system-narrate');
        }

        // Set options
        const options = parsed.options.length > 0 ? parsed.options : response.defaultOptions;
        if (options.length > 0) {
            setNarrativeOptions(options.map(o => typeof o === 'string' ? o : o));
        }

        // Show thinking in console for debugging
        if (parsed.thinking) {
            console.log('%c[思考] ' + parsed.thinking, 'color:#706858;font-style:italic');
        }
    }

    function sendNarrativeInput() {
        const text = DOM_narrInput.value.trim();
        if (!text) return;
        if (!consumeStamina(1, '行动')) return;

        addNarrativeEntry('你', `<p>${text}</p>`, 'player-narrate');
        clearNarrativeOptions();
        DOM_narrInput.value = '';
        DOM_narrInput.focus();
        addHistoryEntry(text.substring(0, 15));

        setTimeout(() => processNarrativeAction(text, 'freeInput'), 500);
    }

    function generateStructuredResponse(input, action) {
        const lower = input.toLowerCase();
        const responses = [];

        if (lower.includes('修炼') || lower.includes('打坐') || action === 'cultivate') {
            responses.push({
                raw: `<thinking>玩家选择修炼，这是提升修为的主要方式。</thinking>
<maintext>你盘膝而坐，双手结印，运转太虚吐纳术。随着呼吸的律动，周围的天地灵气如同溪流般涌入你的经脉，在丹田中凝练成纯净的灵力。

修炼的过程枯燥却充实。你感受到体内的灵力正在缓缓增长，每一缕灵气的融入都让你的修为更加稳固。石室中的夜明珠散发着柔和的光芒，你的心神完全沉浸在修炼之中。</maintext>
<option>继续修炼，冲击更高层次</option>
<option>停下修炼，去坊市购买丹药辅助</option>
<option>去战斗，以实战检验修为</option>
<option>自由行动...</option>
<sum>潜心修炼</sum>`,
                defaultOptions: ['继续修炼', '去坊市看看', '寻找妖兽战斗', '自由行动...']
            });
        } else if (lower.includes('战斗') || lower.includes('妖兽') || lower.includes('敌人') || action === 'goMission') {
            responses.push({
                raw: `<thinking>玩家想要战斗或探险。需要判断是否有合适的对手。</thinking>
<maintext>你来到宗门的演武场，几位同门正在切磋技艺。剑光闪烁，灵气激荡。演武场边缘的任务布告栏上张贴着几份悬赏令——

「青阳镇附近有妖兽出没，祸害百姓。急需修士前往除妖。建议修为：练气期五层以上。」

你掂量了一下自己的实力。以目前练气期三层的修为，独自面对妖兽尚有风险，但若是小心行事，也未尝不可。或者，你可以先在演武场与同门切磋，积累战斗经验。</maintext>
<option>接下悬赏令，前往青阳镇除妖</option>
<option>在演武场与同门切磋练手</option>
<option>先回去修炼，提升实力再来</option>
<option>自由行动...</option>
<sum>演武场·除妖任务</sum>`,
                defaultOptions: ['接下悬赏令', '在演武场切磋', '回去修炼', '自由行动...']
            });
        } else if (lower.includes('坊市') || lower.includes('购买') || lower.includes('交易')) {
            responses.push({
                raw: `<thinking>玩家前往坊市交易。这是获取资源的重要途径。</thinking>
<maintext>你御剑来到宗门外的坊市。这里热闹非凡，修士们来来往往，摊位上的各种灵材、丹药、法器琳琅满目。

一位白发苍苍的老者坐在角落里，面前摆放着几瓶丹药。「小友，来看看吧，老夫炼制的回灵丹品质上乘，只需五十灵石一瓶。」不远处，一个年轻修士正在叫卖他偶然得到的法器。

你的储物袋中有一些灵石，足够购买一些必需品。坊市的物品可以在「坊市」页面查看和购买。</maintext>
<option>购买回灵丹（50灵石）</option>
<option>逛逛法器摊位</option>
<option>打听最近的消息</option>
<option>自由行动...</option>
<sum>坊市交易</sum>`,
                defaultOptions: ['购买回灵丹', '逛法器摊位', '打听消息', '自由行动...']
            });
        } else if (lower.includes('宗门') || lower.includes('师门') || action === 'exploreSect') {
            responses.push({
                raw: `<thinking>玩家在宗门内探索。太虚剑宗是一个剑修门派。</thinking>
<maintext>你在太虚剑宗内缓步而行。宗门依山而建，层层叠叠的殿宇在云雾中若隐若现。路过的弟子们有的御剑飞行，有的抱剑而行，每个人都沉浸在自己的修行之中。

前方是传功殿，剑尘长老正在讲授剑道。据说他曾在金丹期时一剑斩杀三头妖兽，威震一方。你若能得到他的指点，剑道修为必定大进。

再往前走则是藏经阁，收录了宗门千年来的各类功法典籍。不过以你目前内门弟子的身份，只能阅览黄阶功法。</maintext>
<option>去传功殿听长老讲道</option>
<option>前往藏经阁查阅功法</option>
<option>回修炼室继续修炼</option>
<option>自由行动...</option>
<sum>宗门漫步</sum>`,
                defaultOptions: ['去传功殿听道', '去藏经阁', '回去修炼', '自由行动...']
            });
        } else if (lower.includes('突破') || lower.includes('境界') || lower.includes('晋级')) {
            responses.push({
                raw: `<thinking>玩家关注境界突破。需要检查是否满足突破条件。</thinking>
<maintext>突破境界是修仙之路上最关键的一步。每一次大境界的跨越，都是对自身极限的超越。从炼气期突破至筑基期，需要修炼进度达到圆满，并且备好筑基丹以提高成功率。

你查看了一下自身的状态。当前修炼进度为${GameState.player.cultivationProgress}%，距离圆满尚有一段距离。突破之事不可操之过急，根基不牢则后患无穷。当修炼进度达到100%后，前往「突破」页面尝试破境。</maintext>
<option>继续修炼，提升进度</option>
<option>去坊市购买筑基丹</option>
<option>去「突破」页面查看详情</option>
<option>自由行动...</option>
<sum>关注突破</sum>`,
                defaultOptions: ['继续修炼', '购买筑基丹', '查看突破页面', '自由行动...']
            });
        } else {
            responses.push({
                raw: `<thinking>通用探索回复。玩家进行了自由行动。</thinking>
<maintext>你在太虚剑宗中漫步，感受着天地间流转的灵气。修仙之路漫漫，每一步都凝聚着修士的心血与感悟。

前方有数条道路可走——你可以去修炼室打坐练功，也可以去演武场磨练战斗技巧，或是前往坊市交易物品。宗门任务堂也有适合你的任务等待接取。

天地之大，机缘无数。你的每一次选择，都将影响你的修仙之路。</maintext>
<option>去修炼室打坐练功</option>
<option>去演武场锻炼战斗</option>
<option>去坊市购买物品</option>
<option>自由行动...</option>
<sum>自由探索</sum>`,
                defaultOptions: ['去修炼室', '去演武场', '去坊市', '自由行动...']
            });
        }

        return responses[0];
    }

    // 探索页选项点击事件
    DOM_narrOptions.addEventListener('click', (e) => {
        const btn = e.target.closest('.narr-option');
        if (!btn) return;
        // handled by individual button listeners set in setNarrativeOptions
    });

    DOM_narrSend.addEventListener('click', sendNarrativeInput);
    DOM_narrInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNarrativeInput();
        }
    });

    // 保留底部 LLM 栏兼容
    function sendLlmMessage() {
        const input = DOM.llmInput;
        const text = input.value.trim();
        if (!text) return;
        if (!consumeStamina(1, '进行探索')) return;
        addLlmMessage('你', text, 'player');
        input.value = '';
        input.focus();

        setTimeout(() => {
            const resp = generateStructuredResponse(text, 'freeInput');
            const parsed = parseNarrativeResponse(resp.raw);
            const displayText = parsed.maintext || resp.raw;
            addLlmMessage('系统', displayText.replace(/<[^>]+>/g, '').substring(0, 120) + '...', 'system');

            // Also show in explore tab if not already there
            if (document.getElementById('tabExplore').classList.contains('active')) {
                const paragraphs = displayText.split('\n\n').filter(p => p.trim());
                addNarrativeEntry('系统', paragraphs.map(p => `<p>${p}</p>`).join(''), 'system-narrate');
                const options = parsed.options.length > 0 ? parsed.options : resp.defaultOptions;
                if (options.length > 0) {
                    setNarrativeOptions(options.map(o => typeof o === 'string' ? o : o));
                }
            }
        }, 600 + Math.random() * 800);
    }

    function addLlmMessage(sender, text, type) {
        const msg = document.createElement('div');
        msg.className = 'llm-msg';
        msg.innerHTML = `<span class="msg-sender">${sender}</span><span class="msg-text">${text}</span>`;
        DOM.llmHistory.appendChild(msg);
        DOM.llmHistory.scrollTop = DOM.llmHistory.scrollHeight;
        while (DOM.llmHistory.children.length > 20) {
            DOM.llmHistory.firstElementChild.remove();
        }
    }

    DOM.btnLlmSend.addEventListener('click', sendLlmMessage);
    DOM.llmInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendLlmMessage();
        }
    });

    DOM.btnLlmToggle.addEventListener('click', () => {
        DOM.llmBar.classList.toggle('expanded');
    });

    DOM.btnLlmMode.addEventListener('click', (e) => {
        createRipple(e, DOM.btnLlmMode);
        NotificationSystem.info('对话模式', '当前模式：自由探索。输入你想做的事情，开始你的修仙之旅。');
    });

    /* ================================
       设置
       ================================ */
    DOM.btnNextTurn.addEventListener('click', (e) => {
        createRipple(e, DOM.btnNextTurn);
        advanceTurn();
    });

    DOM.btnSettings.addEventListener('click', (e) => {
        createRipple(e, DOM.btnSettings);
        ModalManager.open(DOM.modalSettings);
    });

    DOM.settingParticles.addEventListener('change', function () {
        ParticleSystem.toggle(this.checked);
    });

    DOM.settingAnimations.addEventListener('change', function () {
        GameState.settings.animations = this.checked;
        document.documentElement.style.setProperty(
            '--transition-smooth',
            this.checked ? '300ms cubic-bezier(0.16, 1, 0.3, 1)' : '0ms'
        );
        document.documentElement.style.setProperty(
            '--transition-fast',
            this.checked ? '150ms cubic-bezier(0.16, 1, 0.3, 1)' : '0ms'
        );
    });

    // Close settings modal
    DOM.modalSettings.querySelector('.modal-close')?.addEventListener('click', () => {
        ModalManager.close(DOM.modalSettings);
    });
    DOM.modalSettings.querySelector('.modal-backdrop')?.addEventListener('click', () => {
        ModalManager.close(DOM.modalSettings);
    });

    /* ================================
       模态框关闭按钮绑定
       ================================ */
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) ModalManager.close(modal);
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function () {
            const modal = this.closest('.modal');
            if (modal) ModalManager.close(modal);
        });
    });

    /* ================================
       键盘快捷键
       ================================ */
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter to toggle cultivation
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            switchTab('cultivation');
            toggleCultivation();
        }

        // Ctrl+Period to advance turn
        if (e.ctrlKey && e.key === '.') {
            e.preventDefault();
            advanceTurn();
        }

        // Escape to close modals (handled natively by dialog)

        // Number keys for tab switching
        if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
            e.preventDefault();
            const tabs = ['explore', 'cultivation', 'combat', 'breakthrough', 'abode', 'techniques', 'market', 'sect'];
            switchTab(tabs[parseInt(e.key) - 1]);
        }
    });

    /* ================================
       全局涟漪效果绑定
       ================================ */
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-primary, .btn-combat, .btn-buy, .btn-quest');
        if (btn && !e.target.closest('#btnCultivate') && !e.target.closest('#btnAttack') &&
            !e.target.closest('#btnSkill1') && !e.target.closest('#btnSkill2') &&
            !e.target.closest('#btnDefend') && !e.target.closest('#btnBreakthrough') &&
            !e.target.closest('#btnSettings') && !e.target.closest('#btnLlmMode')) {
            createRipple(e, btn);
        }
    });

    /* ================================
       初始化
       ================================ */
    function init() {
        ParticleSystem.init();
        updateCultivationUI();
        updateCombatUI();
        setCombatButtonsEnabled(false);

        // Show welcome notification
        setTimeout(() => {
            NotificationSystem.info(
                '欢迎来到太虚之境',
                '你是一名初入道途的修士。开始修炼，探索这片充满灵气的修仙世界吧。',
                5000
            );
        }, 800);

        // Periodic update for UI
        setInterval(updateCultivationUI, 5000);
    }

    init();

    console.log('%c 太虚之境 %c 修仙世界 ',
        'font-size:1.4em;font-family:"Noto Serif SC",serif;color:#c9a84c;',
        'font-size:0.9em;color:#b8a890;');
    console.log('%c东方玄幻修仙网页游戏 · 前端原型', 'color:#706858;font-style:italic;');

})();
