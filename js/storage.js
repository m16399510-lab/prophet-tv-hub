(function () {
    'use strict';

    var clientCache = null;
    var LOCAL_FALLBACK_KEY = 'prophet_tv_hub_data_v6';
    var SESSION_KEY = 'prophet_tv_hub_admin_session';

    function getConfig() {
        return window.PROPHET_TV_CONFIG || {};
    }

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getDefaultSnapshot() {
        return normalizeSnapshot(deepClone(window.PROPHET_TV_DEFAULT_DATA || { bulletin: {}, games: [] }));
    }

    function getLocalKey() {
        var config = getConfig();
        return config.localStorageKey || LOCAL_FALLBACK_KEY;
    }

    function clamp(value, min, max) {
        var number = Number(value);
        if (!Number.isFinite(number)) {
            return min;
        }
        return Math.min(max, Math.max(min, Math.round(number)));
    }

    function toText(value, fallback) {
        if (value === null || value === undefined) {
            return fallback || '';
        }
        return String(value).trim();
    }

    function toBoolean(value, fallback) {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() !== 'false';
        }
        return Boolean(value);
    }

    function normalizeTags(value) {
        if (Array.isArray(value)) {
            return value
                .map(function (item) { return toText(item, ''); })
                .filter(Boolean)
                .filter(function (item, index, list) { return list.indexOf(item) === index; });
        }

        return toText(value, '')
            .split(/[,，]/)
            .map(function (item) { return item.trim(); })
            .filter(Boolean)
            .filter(function (item, index, list) { return list.indexOf(item) === index; });
    }

    function normalizeStatus(value) {
        var text = toText(value, 'planning').toLowerCase();
        if (['live', 'building', 'planning', 'maintenance'].indexOf(text) > -1) {
            return text;
        }
        return 'planning';
    }

    function createIdFromTitle(title) {
        var slug = toText(title, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (slug) {
            return slug;
        }

        return 'game-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function createBlankGame(seed) {
        return normalizeGame(Object.assign({
            id: '',
            title: '',
            subtitle: '',
            universe: '',
            category: '',
            tags: [],
            status: 'planning',
            progressLabel: '',
            progressValue: 0,
            pricing: '',
            summary: '',
            description: '',
            spotlight: '',
            linkLabel: '进入作品',
            linkUrl: '',
            downloadLabel: 'App 下载',
            downloadUrl: '',
            coverUrl: 'assets/covers/pit-wall.svg',
            sortOrder: 50,
            featured: false,
            visible: true,
            updatedAt: today()
        }, seed || {}), 0);
    }

    function normalizeBulletin(raw) {
        raw = raw || {};
        return {
            eyebrow: toText(raw.eyebrow, '公告说明区'),
            title: toText(raw.title, '欢迎来到预言家TV文游合集'),
            body: toText(raw.body, '')
        };
    }

    function normalizeGame(raw, index) {
        raw = raw || {};
        return {
            id: toText(raw.id, '') || createIdFromTitle(raw.title || ('game-' + index)),
            title: toText(raw.title, '未命名作品'),
            subtitle: toText(raw.subtitle, '副标题待补'),
            universe: toText(raw.universe, '待定'),
            category: toText(raw.category, '未分类'),
            tags: normalizeTags(raw.tags),
            status: normalizeStatus(raw.status),
            progressLabel: toText(raw.progressLabel, '进度说明待补'),
            progressValue: clamp(raw.progressValue, 0, 100),
            pricing: toText(raw.pricing, '待补充'),
            summary: toText(raw.summary, ''),
            description: toText(raw.description, ''),
            spotlight: toText(raw.spotlight, ''),
            linkLabel: toText(raw.linkLabel, '进入作品'),
            linkUrl: toText(raw.linkUrl, ''),
            downloadLabel: toText(raw.downloadLabel, 'App 下载'),
            downloadUrl: toText(raw.downloadUrl, ''),
            coverUrl: toText(raw.coverUrl, 'assets/covers/pit-wall.svg'),
            sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : (index + 1) * 10,
            featured: toBoolean(raw.featured, false),
            visible: toBoolean(raw.visible, true),
            updatedAt: toText(raw.updatedAt, today()),
            downloads: Array.isArray(raw.downloads) ? raw.downloads : [],
            tip: toText(raw.tip, ''),
            series: toText(raw.series, '')
        };
    }

    function normalizeSnapshot(raw) {
        raw = raw || {};
        var games = Array.isArray(raw.games) ? raw.games : [];

        return {
            bulletin: normalizeBulletin(raw.bulletin),
            games: games
                .map(function (item, index) { return normalizeGame(item, index); })
                .sort(function (left, right) {
                    if (left.sortOrder !== right.sortOrder) {
                        return left.sortOrder - right.sortOrder;
                    }
                    return left.title.localeCompare(right.title, 'zh-CN');
                })
        };
    }

    function ensureLocalSnapshot() {
        var key = getLocalKey();
        var existing = null;

        try {
            existing = window.localStorage.getItem(key);
        } catch (error) {
            return getDefaultSnapshot();
        }

        if (!existing) {
            var fallback = getDefaultSnapshot();
            try {
                window.localStorage.setItem(key, JSON.stringify(fallback));
            } catch (error) {
                return fallback;
            }
            return fallback;
        }

        try {
            return normalizeSnapshot(JSON.parse(existing));
        } catch (error) {
            var repaired = getDefaultSnapshot();
            try {
                window.localStorage.setItem(key, JSON.stringify(repaired));
            } catch (writeError) {
                return repaired;
            }
            return repaired;
        }
    }

    function readLocalSnapshot() {
        /* 本地模式永远使用 data/*.js 中的最新数据，不读 localStorage 缓存。
           这样改完 JS 文件后刷新页面就能立即看到效果。 */
        return getDefaultSnapshot();
    }

    function writeLocalSnapshot(snapshot) {
        var normalized = normalizeSnapshot(snapshot);
        window.localStorage.setItem(getLocalKey(), JSON.stringify(normalized));
        return normalized;
    }

    function shouldUseSupabase() {
        var config = getConfig();
        return config.storageMode === 'supabase'
            && config.supabase
            && config.supabase.url
            && config.supabase.anonKey
            && window.supabase
            && typeof window.supabase.createClient === 'function';
    }

    function getSupabaseClient() {
        if (!shouldUseSupabase()) {
            return null;
        }

        if (!clientCache) {
            var config = getConfig();
            clientCache = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
        }

        return clientCache;
    }

    function getRuntimeLabel() {
        return shouldUseSupabase() ? 'Supabase 在线模式' : '本地演示模式';
    }

    function saveSession(auth) {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            username: auth.username,
            password: auth.password
        }));
    }

    function readSession() {
        var raw = window.sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            return null;
        }

        try {
            var parsed = JSON.parse(raw);
            if (!parsed.username || !parsed.password) {
                return null;
            }
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function clearSession() {
        window.sessionStorage.removeItem(SESSION_KEY);
    }

    function requireLocalAdmin(auth) {
        var config = getConfig();
        var admin = config.admin || {};
        if (auth.username !== admin.username || auth.password !== admin.password) {
            throw new Error('用户名或密码不正确。');
        }
    }

    async function getPublicData() {
        if (!shouldUseSupabase()) {
            return readLocalSnapshot();
        }

        var client = getSupabaseClient();

        try {
            var rpcResult = await client.rpc('ptv_public_snapshot');
            if (!rpcResult.error && rpcResult.data && rpcResult.data.success) {
                return normalizeSnapshot(rpcResult.data.data);
            }
        } catch (error) {
            // Ignore and try the table fallback below.
        }

        var responses = await Promise.all([
            client.from('ptv_site_content').select('payload').eq('content_key', 'bulletin').maybeSingle(),
            client.from('ptv_games').select('payload').eq('is_visible', true).order('sort_order', { ascending: true }).order('updated_at', { ascending: false })
        ]);

        var bulletinResponse = responses[0];
        var gamesResponse = responses[1];

        if (bulletinResponse.error && bulletinResponse.error.code !== 'PGRST116') {
            throw new Error('公告读取失败：' + bulletinResponse.error.message);
        }

        if (gamesResponse.error) {
            throw new Error('作品读取失败：' + gamesResponse.error.message);
        }

        return normalizeSnapshot({
            bulletin: bulletinResponse.data ? bulletinResponse.data.payload : {},
            games: (gamesResponse.data || []).map(function (row) {
                return row.payload || {};
            })
        });
    }

    async function adminLogin(username, password) {
        var auth = {
            username: toText(username, ''),
            password: toText(password, '')
        };

        if (!auth.username || !auth.password) {
            throw new Error('请先输入用户名和密码。');
        }

        if (!shouldUseSupabase()) {
            requireLocalAdmin(auth);
            return {
                success: true,
                auth: auth
            };
        }

        var client = getSupabaseClient();
        var response = await client.rpc('ptv_admin_login', {
            p_username: auth.username,
            p_password: auth.password
        });

        if (response.error) {
            throw new Error('登录失败：' + response.error.message);
        }

        if (!response.data || !response.data.success) {
            throw new Error((response.data && response.data.message) || '登录失败。');
        }

        return {
            success: true,
            auth: auth
        };
    }

    async function getAdminData(auth) {
        auth = auth || {};

        if (!shouldUseSupabase()) {
            requireLocalAdmin(auth);
            return readLocalSnapshot();
        }

        var client = getSupabaseClient();
        var response = await client.rpc('ptv_admin_get_snapshot', {
            p_username: auth.username,
            p_password: auth.password
        });

        if (response.error) {
            throw new Error('后台数据读取失败：' + response.error.message);
        }

        if (!response.data || !response.data.success) {
            throw new Error((response.data && response.data.message) || '后台数据读取失败。');
        }

        return normalizeSnapshot(response.data.data);
    }

    async function saveBulletin(auth, bulletin) {
        var normalized = normalizeBulletin(bulletin);

        if (!shouldUseSupabase()) {
            requireLocalAdmin(auth);
            var localSnapshot = readLocalSnapshot();
            localSnapshot.bulletin = normalized;
            return writeLocalSnapshot(localSnapshot);
        }

        var client = getSupabaseClient();
        var response = await client.rpc('ptv_admin_update_bulletin', {
            p_username: auth.username,
            p_password: auth.password,
            p_payload: normalized
        });

        if (response.error) {
            throw new Error('公告保存失败：' + response.error.message);
        }

        if (!response.data || !response.data.success) {
            throw new Error((response.data && response.data.message) || '公告保存失败。');
        }

        return getAdminData(auth);
    }

    async function saveGame(auth, game) {
        var normalized = normalizeGame(game, 0);
        if (!normalized.id) {
            normalized.id = createIdFromTitle(normalized.title);
        }
        normalized.updatedAt = today();

        if (!shouldUseSupabase()) {
            requireLocalAdmin(auth);
            var localSnapshot = readLocalSnapshot();
            var index = localSnapshot.games.findIndex(function (item) {
                return item.id === normalized.id;
            });

            if (index > -1) {
                localSnapshot.games[index] = normalized;
            } else {
                localSnapshot.games.push(normalized);
            }

            return writeLocalSnapshot(localSnapshot);
        }

        var client = getSupabaseClient();
        var response = await client.rpc('ptv_admin_upsert_game', {
            p_username: auth.username,
            p_password: auth.password,
            p_payload: normalized
        });

        if (response.error) {
            throw new Error('作品保存失败：' + response.error.message);
        }

        if (!response.data || !response.data.success) {
            throw new Error((response.data && response.data.message) || '作品保存失败。');
        }

        return getAdminData(auth);
    }

    async function deleteGame(auth, gameId) {
        var id = toText(gameId, '');
        if (!id) {
            throw new Error('缺少作品编号。');
        }

        if (!shouldUseSupabase()) {
            requireLocalAdmin(auth);
            var localSnapshot = readLocalSnapshot();
            localSnapshot.games = localSnapshot.games.filter(function (item) {
                return item.id !== id;
            });
            return writeLocalSnapshot(localSnapshot);
        }

        var client = getSupabaseClient();
        var response = await client.rpc('ptv_admin_delete_game', {
            p_username: auth.username,
            p_password: auth.password,
            p_game_id: id
        });

        if (response.error) {
            throw new Error('作品删除失败：' + response.error.message);
        }

        if (!response.data || !response.data.success) {
            throw new Error((response.data && response.data.message) || '作品删除失败。');
        }

        return getAdminData(auth);
    }

    window.ProphetTVStorage = {
        createBlankGame: createBlankGame,
        readSession: readSession,
        saveSession: saveSession,
        clearSession: clearSession,
        getRuntimeLabel: getRuntimeLabel,
        isSupabaseReady: shouldUseSupabase,
        getPublicData: getPublicData,
        adminLogin: adminLogin,
        getAdminData: getAdminData,
        saveBulletin: saveBulletin,
        saveGame: saveGame,
        deleteGame: deleteGame
    };
})();
