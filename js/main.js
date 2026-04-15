(function () {
    'use strict';

    var storage = window.ProphetTVStorage;
    var state = {
        snapshot: {
            bulletin: {},
            games: []
        },
        activeTag: '全部',
        query: '',
        status: 'all'
    };

    var statusMeta = {
        live: { label: '开放中', className: 'status-live' },
        building: { label: '开发中', className: 'status-building' },
        planning: { label: '筹备中', className: 'status-planning' },
        maintenance: { label: '维护中', className: 'status-maintenance' }
    };

    var elements = {

        bulletinEyebrow: document.getElementById('bulletinEyebrow'),
        bulletinTitle: document.getElementById('bulletinTitle'),

        searchInput: document.getElementById('searchInput'),
        statusFilter: document.getElementById('statusFilter'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        tagRail: document.getElementById('tagRail'),
        resultsMeta: document.getElementById('resultsMeta'),
        gamesList: document.getElementById('gamesList')
    };

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function hasUsableLink(url) {
        return Boolean(url) && url !== '#';
    }

    function getAllTags(games) {
        var pool = [];
        games.forEach(function (game) {
            (game.tags || []).forEach(function (tag) {
                if (tag && pool.indexOf(tag) === -1) {
                    pool.push(tag);
                }
            });
        });
        return pool;
    }

    function getVisibleGames() {
        return (state.snapshot.games || []).filter(function (game) {
            return game.visible !== false;
        });
    }

    function getFilteredGames() {
        var query = state.query.toLowerCase();

        return getVisibleGames().filter(function (game) {
            var searchBlob = [
                game.title,
                game.subtitle,
                game.universe,
                game.category,
                game.summary,
                game.description,
                game.pricing,
                game.spotlight,
                (game.tags || []).join(' ')
            ].join(' ').toLowerCase();

            var matchesQuery = !query || searchBlob.indexOf(query) > -1;
            var matchesStatus = state.status === 'all' || game.status === state.status;
            var matchesTag = state.activeTag === '全部' || (game.tags || []).indexOf(state.activeTag) > -1;

            return matchesQuery && matchesStatus && matchesTag;
        });
    }

    function renderBulletin() {
        var bulletin = state.snapshot.bulletin || {};
        elements.bulletinEyebrow.textContent = bulletin.eyebrow || '公告说明区';
        elements.bulletinTitle.textContent = bulletin.title || '欢迎来到本杰驴的魔法世界';
    }

    function renderTagRail() {
        var tags = getAllTags(getVisibleGames());

        var chips = ['全部'].concat(tags).map(function (tag) {
            var active = tag === state.activeTag ? ' active' : '';
            return '<button class="tag-chip' + active + '" type="button" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>';
        }).join('');

        elements.tagRail.innerHTML = chips || '<span class="admin-muted">暂时还没有标签。</span>';

        Array.prototype.slice.call(elements.tagRail.querySelectorAll('[data-tag]')).forEach(function (button) {
            button.addEventListener('click', function () {
                state.activeTag = button.getAttribute('data-tag') || '全部';
                renderAll();
            });
        });
    }

    function renderGames() {
        var visibleGames = getVisibleGames();
        var filteredGames = getFilteredGames();

        elements.resultsMeta.textContent = '当前显示 ' + filteredGames.length + ' / ' + visibleGames.length + ' 个作品';

        if (!filteredGames.length) {
            elements.gamesList.innerHTML = (
                '<article class="empty-state-panel">' +
                '<p class="section-eyebrow">暂无匹配结果</p>' +
                '<h3>这次筛选没有搜到合适的片场。</h3>' +
                '<p>可以试着清空关键词，或者换个更宽一点的标签继续找。</p>' +
                '</article>'
            );
            return;
        }

        elements.gamesList.innerHTML = filteredGames.map(function (game) {
            var status = statusMeta[game.status] || statusMeta.planning;
            var tagHtml = (game.tags || []).filter(Boolean).map(function (tag) {
                return '<span class="mini-chip">' + escapeHtml(tag) + '</span>';
            }).join('');

            var coverInner = '<img src="' + escapeHtml(game.coverUrl) + '" alt="' + escapeHtml(game.title) + ' 封面">';
            var coverOuter = hasUsableLink(game.linkUrl)
                ? '<a class="cover-shell" href="' + escapeHtml(game.linkUrl) + '" target="_blank" rel="noreferrer">' + coverInner + '</a>'
                : '<div class="cover-shell cover-shell-static">' + coverInner + '</div>';

            var primaryAction = hasUsableLink(game.linkUrl)
                ? '<a class="primary-button" href="' + escapeHtml(game.linkUrl) + '" target="_blank" rel="noreferrer">' + escapeHtml(game.linkLabel || '进入作品') + '</a>'
                : '<span class="soft-button soft-button-muted">' + escapeHtml(game.linkLabel || '入口待补') + '</span>';

            /* 下载区：支持多平台 */
            var downloads = game.downloads || [];
            var downloadHtml = '';
            if (downloads.length > 0) {
                downloadHtml = '<div class="download-group">' +
                    downloads.map(function (dl) {
                        var btn = hasUsableLink(dl.url)
                            ? '<a class="soft-button" href="' + escapeHtml(dl.url) + '" target="_blank" rel="noreferrer">📥 ' + escapeHtml(dl.platform) + '</a>'
                            : '<span class="soft-button soft-button-muted">' + escapeHtml(dl.platform) + '</span>';
                        var hint = dl.password ? '<span class="password-hint">密码：<code>' + escapeHtml(dl.password) + '</code></span>' : '';
                        return '<div class="download-item">' + btn + hint + '</div>';
                    }).join('') +
                    '</div>';
            }

            /* 类型 / 亮点 info cell */
            var spotlightCell = game.spotlight
                ? '<div class="info-cell"><span>类型</span><strong>' + escapeHtml(game.spotlight) + '</strong></div>'
                : '';

            return (
                '<article class="game-panel">' +
                '<div class="game-cover-col">' + coverOuter + '</div>' +
                '<div class="game-info-col">' +
                '<div class="game-topline">' +
                '<span class="status-pill ' + status.className + '">' + status.label + '</span>' +
                (game.featured ? '<span class="status-pill status-featured">重点企划</span>' : '') +
                '</div>' +
                '<div class="game-title-row">' +
                '<div>' +
                '<h3>' + escapeHtml(game.title) + '</h3>' +
                '<p class="game-subtitle">' + escapeHtml(game.subtitle) + '</p>' +
                '</div>' +
                '</div>' +
                '<div class="tag-list">' + tagHtml + '</div>' +
                '<p class="game-summary">' + escapeHtml(game.summary) + '</p>' +
                (game.description ? '<p class="game-description">' + escapeHtml(game.description) + '</p>' : '') +
                '<div class="progress-row">' +
                '<div class="progress-head">' +
                '<span>' + escapeHtml(game.progressLabel) + '</span>' +
                '<strong>' + escapeHtml(String(game.progressValue)) + '%</strong>' +
                '</div>' +
                '<div class="progress-track"><span class="progress-fill" style="width:' + escapeHtml(String(game.progressValue)) + '%"></span></div>' +
                '</div>' +
                '<div class="info-grid">' +
                '<div class="info-cell"><span>收费标准</span><strong>' + escapeHtml(game.pricing) + '</strong></div>' +
                spotlightCell +
                '</div>' +
                '<div class="action-row">' + primaryAction + '</div>' +
                downloadHtml +
                (game.tip ? '<p class="card-tip">' + escapeHtml(game.tip) + '</p>' : '') +
                '</div>' +
                '</article>'
            );
        }).join('');
    }

    function renderAll() {
        renderBulletin();
        renderTagRail();
        renderGames();
    }

    function bindEvents() {
        elements.searchInput.addEventListener('input', function () {
            state.query = elements.searchInput.value.trim();
            renderGames();
        });

        elements.statusFilter.addEventListener('change', function () {
            state.status = elements.statusFilter.value;
            renderGames();
        });

        elements.clearSearchBtn.addEventListener('click', function () {
            state.query = '';
            state.status = 'all';
            state.activeTag = '全部';
            elements.searchInput.value = '';
            elements.statusFilter.value = 'all';
            renderAll();
        });
    }

    async function init() {

        bindEvents();

        try {
            state.snapshot = await storage.getPublicData();
            renderAll();
        } catch (error) {
            elements.gamesList.innerHTML = (
                '<article class="empty-state-panel">' +
                '<p class="section-eyebrow">读取失败</p>' +
                '<h3>水晶球暂时起雾了。</h3>' +
                '<p>' + escapeHtml(error.message || '请稍后再试。') + '</p>' +
                '</article>'
            );
        }
    }

    init();
})();
