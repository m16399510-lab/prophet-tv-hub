(function () {
    'use strict';

    var storage = window.ProphetTVStorage;
    var PAGE_SIZE = 5;
    var state = {
        snapshot: {
            bulletin: {},
            games: []
        },
        activeTag: '全部',
        query: '',
        status: 'all',
        currentPage: 1
    };

    var statusMeta = {
        live: { label: '开放中', className: 'status-live' },
        testing: { label: '内测中', className: 'status-testing' },
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
        gamesList: document.getElementById('gamesList'),
        paginationControls: document.getElementById('paginationControls')
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

    var optimizedCoverSources = {
        'assets/covers/owlpost.png': {
            webpSmall: 'assets/covers/optimized/owlpost-360.webp',
            webpLarge: 'assets/covers/optimized/owlpost-720.webp',
            small: 'assets/covers/optimized/owlpost-360.jpg',
            large: 'assets/covers/optimized/owlpost-720.jpg'
        },
        'assets/covers/dark-era.png': {
            webpSmall: 'assets/covers/optimized/dark-era-360.webp',
            webpLarge: 'assets/covers/optimized/dark-era-720.webp',
            small: 'assets/covers/optimized/dark-era-360.jpg',
            large: 'assets/covers/optimized/dark-era-720.jpg'
        },
        'assets/covers/magic-world.png': {
            webpSmall: 'assets/covers/optimized/magic-world-360.webp',
            webpLarge: 'assets/covers/optimized/magic-world-720.webp',
            small: 'assets/covers/optimized/magic-world-360.jpg',
            large: 'assets/covers/optimized/magic-world-720.jpg'
        },
        'assets/covers/qzgo.jpg': {
            webpSmall: 'assets/covers/optimized/qzgo-360.webp',
            webpLarge: 'assets/covers/optimized/qzgo-720.webp',
            small: 'assets/covers/optimized/qzgo-360.jpg',
            large: 'assets/covers/optimized/qzgo-720.jpg'
        },
        'assets/covers/dark-fairytale-island.jpg': {
            webpSmall: 'assets/covers/optimized/dark-fairytale-island-360.webp',
            webpLarge: 'assets/covers/optimized/dark-fairytale-island-720.webp',
            small: 'assets/covers/optimized/dark-fairytale-island-360.jpg',
            large: 'assets/covers/optimized/dark-fairytale-island-720.jpg'
        },
        'assets/covers/pet-shop.png': {
            webpSmall: 'assets/covers/optimized/pet-shop-360.webp',
            webpLarge: 'assets/covers/optimized/pet-shop-720.webp',
            small: 'assets/covers/optimized/pet-shop-360.jpg',
            large: 'assets/covers/optimized/pet-shop-720.jpg'
        },
        'assets/covers/paddock-club.jpg': {
            webpSmall: 'assets/covers/optimized/paddock-club-360.webp',
            webpLarge: 'assets/covers/optimized/paddock-club-720.webp',
            small: 'assets/covers/optimized/paddock-club-360.jpg',
            large: 'assets/covers/optimized/paddock-club-720.jpg'
        }
    };

    function renderCoverImage(game, index) {
        var optimized = optimizedCoverSources[game.coverUrl];
        var isNearFirstScreen = index < 2;
        var img = '<img src="' + escapeHtml(game.coverUrl) + '" alt="' + escapeHtml(game.title) + ' 封面"' +
            ' width="600" height="800"' +
            ' loading="' + (isNearFirstScreen ? 'eager' : 'lazy') + '"' +
            ' decoding="async"' +
            ' fetchpriority="' + (index === 0 ? 'high' : 'auto') + '">';

        if (!optimized) {
            return img;
        }

        return '<picture>' +
            '<source media="(max-width: 700px)" type="image/webp" srcset="' +
            escapeHtml(optimized.webpSmall) + ' 360w, ' +
            escapeHtml(optimized.webpLarge) + ' 720w" sizes="calc(100vw - 50px)">' +
            '<source media="(max-width: 700px)" type="image/jpeg" srcset="' +
            escapeHtml(optimized.small) + ' 360w, ' +
            escapeHtml(optimized.large) + ' 720w" sizes="calc(100vw - 50px)">' +
            img +
            '</picture>';
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

            /* 支持状态标签筛选 (__status__live 等) */
            var matchesTag;
            if (state.activeTag === '全部') {
                matchesTag = true;
            } else if (state.activeTag.indexOf('__status__') === 0) {
                matchesTag = game.status === state.activeTag.replace('__status__', '');
            } else {
                matchesTag = (game.tags || []).indexOf(state.activeTag) > -1;
            }

            return matchesQuery && matchesStatus && matchesTag;
        });
    }

    function getTotalPages(totalItems) {
        return Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    }

    function clampPage(page, totalPages) {
        var number = Number(page);
        if (!Number.isFinite(number)) {
            number = 1;
        }
        return Math.min(totalPages, Math.max(1, Math.round(number)));
    }

    function getPaginationPages(totalPages) {
        var pages = [];
        var index;

        if (totalPages <= 7) {
            for (index = 1; index <= totalPages; index += 1) {
                pages.push(index);
            }
            return pages;
        }

        var start = Math.max(2, state.currentPage - 1);
        var end = Math.min(totalPages - 1, state.currentPage + 1);
        pages.push(1);

        if (start > 2) {
            pages.push('gap-start');
        }

        for (index = start; index <= end; index += 1) {
            pages.push(index);
        }

        if (end < totalPages - 1) {
            pages.push('gap-end');
        }

        pages.push(totalPages);
        return pages;
    }

    function renderPagination(totalPages, totalItems) {
        if (!elements.paginationControls) {
            return;
        }

        if (totalItems <= PAGE_SIZE) {
            elements.paginationControls.hidden = true;
            elements.paginationControls.innerHTML = '';
            return;
        }

        elements.paginationControls.hidden = false;

        var pageButtons = getPaginationPages(totalPages).map(function (page) {
            if (typeof page !== 'number') {
                return '<span class="pagination-gap" aria-hidden="true">...</span>';
            }

            var active = page === state.currentPage ? ' active' : '';
            var current = page === state.currentPage ? ' aria-current="page"' : '';
            return '<button class="pagination-button pagination-number' + active + '" type="button" data-page="' + page + '"' + current + '>' + page + '</button>';
        }).join('');

        elements.paginationControls.innerHTML = (
            '<button class="pagination-button" type="button" data-page="prev"' + (state.currentPage === 1 ? ' disabled' : '') + '>上一页</button>' +
            '<div class="pagination-pages">' + pageButtons + '</div>' +
            '<button class="pagination-button" type="button" data-page="next"' + (state.currentPage === totalPages ? ' disabled' : '') + '>下一页</button>'
        );

        Array.prototype.slice.call(elements.paginationControls.querySelectorAll('[data-page]')).forEach(function (button) {
            button.addEventListener('click', function () {
                var target = button.getAttribute('data-page');
                var nextPage = target === 'prev'
                    ? state.currentPage - 1
                    : target === 'next'
                        ? state.currentPage + 1
                        : Number(target);

                state.currentPage = clampPage(nextPage, totalPages);
                renderGames();
                elements.gamesList.scrollIntoView({ block: 'start' });
            });
        });
    }

    function renderBulletin() {
        var bulletin = state.snapshot.bulletin || {};
        elements.bulletinEyebrow.textContent = bulletin.eyebrow || '公告说明区';
        elements.bulletinTitle.textContent = bulletin.title || '欢迎来到本杰驴的魔法世界';
    }

    function renderTagRail() {
        var tags = getAllTags(getVisibleGames());

        /* 收集实际存在的状态 */
        var statusSet = {};
        getVisibleGames().forEach(function (game) {
            if (game.status && statusMeta[game.status]) {
                statusSet[game.status] = statusMeta[game.status].label;
            }
        });

        var chips = ['全部'].concat(tags).map(function (tag) {
            var active = tag === state.activeTag ? ' active' : '';
            return '<button class="tag-chip' + active + '" type="button" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button>';
        }).join('');

        /* 状态标签 */
        var statusChips = Object.keys(statusSet).map(function (key) {
            var active = state.activeTag === ('__status__' + key) ? ' active' : '';
            return '<button class="tag-chip tag-chip-status ' + statusMeta[key].className + active + '" type="button" data-tag="__status__' + key + '">' + statusSet[key] + '</button>';
        }).join('');

        elements.tagRail.innerHTML = (chips + statusChips) || '<span class="admin-muted">暂时还没有标签。</span>';

        Array.prototype.slice.call(elements.tagRail.querySelectorAll('[data-tag]')).forEach(function (button) {
            button.addEventListener('click', function () {
                state.activeTag = button.getAttribute('data-tag') || '全部';
                state.currentPage = 1;
                renderAll();
            });
        });
    }

    function renderGames() {
        var visibleGames = getVisibleGames();
        var filteredGames = getFilteredGames();
        var totalPages = getTotalPages(filteredGames.length);
        state.currentPage = clampPage(state.currentPage, totalPages);
        var startIndex = (state.currentPage - 1) * PAGE_SIZE;
        var pagedGames = filteredGames.slice(startIndex, startIndex + PAGE_SIZE);

        elements.resultsMeta.textContent = filteredGames.length
            ? '当前显示 ' + (startIndex + 1) + '-' + (startIndex + pagedGames.length) + ' / ' + filteredGames.length + ' 个作品'
            : '当前显示 0 / ' + visibleGames.length + ' 个作品';

        if (!filteredGames.length) {
            elements.gamesList.innerHTML = (
                '<article class="empty-state-panel">' +
                '<p class="section-eyebrow">暂无匹配结果</p>' +
                '<h3>这次筛选没有搜到合适的片场。</h3>' +
                '<p>可以试着清空关键词，或者换个更宽一点的标签继续找。</p>' +
                '</article>'
            );
            renderPagination(totalPages, filteredGames.length);
            return;
        }

        elements.gamesList.innerHTML = pagedGames.map(function (game, index) {
            var status = statusMeta[game.status] || statusMeta.planning;
            var tagHtml = (game.tags || []).filter(Boolean).map(function (tag) {
                return '<span class="mini-chip">' + escapeHtml(tag) + '</span>';
            }).join('');

            var coverInner = renderCoverImage(game, index);
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

            /* 系列徽章 */
            var seriesMeta = {
                'hp-trilogy': { label: 'HP三部曲', className: 'series-hp' }
            };
            var seriesBadge = '';
            if (game.series && seriesMeta[game.series]) {
                var sm = seriesMeta[game.series];
                seriesBadge = '<span class="series-badge ' + sm.className + '">' + sm.label + '</span>';
            }

            return (
                '<article class="game-panel' + (game.series ? ' game-series-' + escapeHtml(game.series) : '') + '" data-game-id="' + escapeHtml(game.id) + '">' +
                '<div class="game-cover-col">' + coverOuter + '</div>' +
                '<div class="game-info-col">' +
                '<div class="game-topline">' +
                '<span class="status-pill ' + status.className + '">' + status.label + '</span>' +
                (game.featured ? '<span class="status-pill status-featured">重点企划</span>' : '') +
                seriesBadge +
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
        renderPagination(totalPages, filteredGames.length);
    }

    function renderAll() {
        renderBulletin();
        renderTagRail();
        renderGames();
    }

    function bindEvents() {
        elements.searchInput.addEventListener('input', function () {
            state.query = elements.searchInput.value.trim();
            state.currentPage = 1;
            renderGames();
        });

        elements.statusFilter.addEventListener('change', function () {
            state.status = elements.statusFilter.value;
            state.currentPage = 1;
            renderGames();
        });

        elements.clearSearchBtn.addEventListener('click', function () {
            state.query = '';
            state.status = 'all';
            state.activeTag = '全部';
            state.currentPage = 1;
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
