// 宣告全域變數
songList = [];
// 初始化播放器
const ap = new APlayer({
    container: document.getElementById('aplayer'),
    fixed: true
});
ap.on("play", function() {
    //沒歌就隨機播放
    if (ap.list.audios.length == 0) play_random();
})
ap.on("timeupdate", function() {
    var name = ap.list.audios[ap.list.index].name || ""
    var artist = ap.list.audios[ap.list.index].artist || ""
    var img = ap.list.audios[ap.list.index].cover || "https://i.imgur.com/ErJMEsh.jpg"
    $('#player button.play[onclick="ap.toggle()"] i').text("pause")
    if (name != $('#player .song-info .name').text()) { //歌名有變才更新
        $('#player .song-info .name').text(name)
        $('#player .song-info .artist').text(artist)
        $('#player img').attr('src', img)
    }
    if ('mediaSession' in navigator) {
        console.log('mediaSession', 'mediaSession' in navigator)
        navigator.mediaSession.metadata = new MediaMetadata({
            title: name,
            artist: artist,
            artwork: [{ src: img, type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', function() { ap.toggle() });
        navigator.mediaSession.setActionHandler('pause', function() { ap.pause() });
        navigator.mediaSession.setActionHandler('seekbackward', function() { ap.seek(ap.audio.currentTime - 10) });
        navigator.mediaSession.setActionHandler('seekforward', function() { ap.seek(ap.audio.currentTime + 10) });
        navigator.mediaSession.setActionHandler('previoustrack', function() { ap.skipBack() });
        navigator.mediaSession.setActionHandler('nexttrack', function() { ap.skipForward() });
    }
})
ap.on("pause", function() {
    $('#player button.play[onclick="ap.toggle()"] i').text("play_arrow")
})
ap.on("error", function() {
    if (window.localStorage["userPASS"]) { //如果有存到密碼就嘗試登入
        $.post("/login/", { userPASS: window.localStorage["userPASS"] }, function(data) {
            if (data == 'success') {
                //mdui.snackbar({ message: 'Session 過期，重新登入成功', timeout: 1000 });
            } else {
                mdui.snackbar({ message: 'Session 過期，請重新登入', timeout: 1000 });
                document.location.href = "/login/";
            }
        });
    } else {
        mdui.snackbar({ message: '播放器發生了未知錯誤', timeout: 1000 });
    }
});
// 初始化網頁
$(function() {
    show_home()
    $('[data-link]').click(function() {
        $('[data-link]').removeClass('mdui-list-item-active')
        $(this).addClass('mdui-list-item-active')
        $("#player").removeClass('hide')
    })
    $('[data-link="home"]').click(function() { show_home() })
    $('[data-link="album"]').click(function() { show_album() })
    $('[data-link="recentlyAlbum"]').click(function() { show_recentlyAlbum() })
    $('[data-link="random"]').click(function() { show_random() })
    $('[data-link="now"]').click(function() { show_now() })

    $('#player>*:not(.ctrl)').click(function() {
        show_now()
    })

});
//-- 加解密
function pp_encode(str) {
    return encodeURIComponent(base64.encode(str))
}

function pp_decode(str) {
    return decodeURIComponent(base64.decode(str))
}
//-- 秒數轉時間
function secondToTime(second) {
    let MM = Math.floor(second / 60)
    let SS = Math.floor(second % 60)
    SS = SS < 10 ? '0' + SS : SS
    return MM + ":" + SS
}

//-- 常用 HTML
function HTML_getHeader(title) {
    return `<div class="mdui-container-fluid mdui-valign mdui-typo" style="height: 300px;background-image:url(/og/og.png);background-size: cover;background-color: #3f51b5;" id="header-wrapper">
    <h1 class="mdui-center mdui-text-color-white">${title}</h1>
</div>`
}

function HTML_getSpinner() {
    return `<div class="mdui-spinner mdui-spinner-colorful mdui-center" style="margin-top:80px"></div>`
}

function HTML_showAlbums(items) {
    //var album = '<div class="mdui-row-md-4 mdui-row-sm-3 mdui-row-xs-2">'
    var album = '<div class="albums">'
    for (i = 0; i < items.length; i++) {　
        let albumData = items[i]
        var artist = albumData.album_artist || albumData.display_artist || ''
        var album_artist = albumData.album_artist || ''
        var name = albumData.name || ''
        if (albumData.criteria) {
            var artist = artist || albumData.criteria.artist || albumData.criteria.album_artist || '未知'
            var album_artist = album_artist || albumData.criteria.album_artist || ''
            var name = name || albumData.criteria.album || ''
        }
        //await getAlbumSong(albumData.criteria.album, albumData.criteria.album_artist, albumData.criteria.artist)
        album += `<div class="mdui-card mdui-ripple mdui-hoverable album" data-album="${name}" data-artist="${artist}" data-album-artist="${album_artist}">
                <div class="mdui-card-media">
                <img src=".${getAlbumCover(name, album_artist, artist)}"/>
                <div class="mdui-card-media-covered mdui-card-media-covered-gradient">
                    <div class="mdui-card-primary">
                    <div class="mdui-card-primary-title">${name}</div>
                    <div class="mdui-card-primary-subtitle">${artist}</div>
                    </div>
                </div>
                </div>
            </div>`
    }
    album += "</div>"
    return album
}

function HTML_showSongs(songs) {
    songList = JSON.stringify(songs)
    var html = `<ul class="mdui-list songs">`
    for (i = 0; i < songs.length; i++) {
        let song = songs[i]
        let title = song.title
        let artist = song.additional.song_tag.artist
        html += `<li class="mdui-list-item mdui-ripple">
            <div class="mdui-list-item-content" data-song-id="${song.id}">
                <div class="mdui-list-item-title mdui-list-item-one-line">${title}</div>
                <div class="mdui-list-item-text mdui-list-item-one-line">${artist}</div>
            </div>
            <button class="mdui-btn mdui-btn-icon mdui-ripple add" data-song-id="${song.id}">
                <i class="mdui-icon material-icons">add</i>
            </button>
        </li>`　
    }
    html += '</ul>'
    return html
}
// 首頁
async function show_home() {
    // 展示讀取中
    var header = HTML_getHeader("PokaPlayer")
    $("#content").html(header + HTML_getSpinner())
    mdui.mutation()

    var data = await getAPI("entry.cgi", "SYNO.AudioStation.Pin", "list", [{ key: "limit", "value": -1 }, { key: "offset", "value": 0 }]),
        album = HTML_showAlbums(data.data.items)
    $("#content").html(header + album)

    $('[data-album]').click(function() {
        show_album_songs(
            $(this).attr('data-artist'),
            $(this).attr('data-album'),
            $(this).attr('data-album-artist'))
    })
}
//- 列出專輯
async function show_album() {
    // 展示讀取中
    var header = HTML_getHeader("專輯")
    $("#content").html(header + HTML_getSpinner())
    mdui.mutation()

    var PARAMS_JSON = [
        { key: "additional", "value": "avg_rating" },
        { key: "library", "value": "shared" },
        { key: "limit", "value": 1000 },
        { key: "sort_by", "value": "display_artist" },
        { key: "sort_direction", "value": "ASC" },
    ]
    var data = await getAPI("AudioStation/album.cgi", "SYNO.AudioStation.Album", "list", PARAMS_JSON, 3),
        album = HTML_showAlbums(data.data.albums)
    $("#content").html(header + album)

    $('[data-album]').click(function() {
        show_album_songs(
            $(this).attr('data-artist'),
            $(this).attr('data-album'),
            $(this).attr('data-album-artist'))
    })
}
// 最近加入ㄉ專輯
async function show_recentlyAlbum() {
    // 展示讀取中
    var header = HTML_getHeader("最近加入的專輯")
    $("#content").html(header + HTML_getSpinner())
    mdui.mutation()
    var PARAMS_JSON = [
        { key: "additional", "value": "avg_rating" },
        { key: "library", "value": "shared" },
        { key: "limit", "value": 100 },
        { key: "method", "value": 'list' },
        { key: "sort_by", "value": "time" },
        { key: "sort_direction", "value": "desc" },
    ]
    var data = await getAPI("AudioStation/album.cgi", "SYNO.AudioStation.Album", "list", PARAMS_JSON, 3),
        album = HTML_showAlbums(data.data.albums)
    $("#content").html(header + album)

    $('[data-album]').click(function() {
        show_album_songs(
            $(this).attr('data-artist'),
            $(this).attr('data-album'),
            $(this).attr('data-album-artist'))
    })
}
//- 隨機播放
async function show_random() {
    // 展示讀取中
    var header = HTML_getHeader("隨機播放")
    $("#content").html(header + HTML_getSpinner())
    mdui.mutation()

    var PARAMS_JSON = [
        { key: "additional", "value": "song_tag,song_audio,song_rating" },
        { key: "library", "value": "shared" },
        { key: "limit", "value": 100 },
        { key: "sort_by", "value": "random" }
    ]
    var data = await getAPI("AudioStation/song.cgi", "SYNO.AudioStation.Song", "list", PARAMS_JSON, 1),
        album = HTML_showSongs(data.data.songs)
    $("#content").html(header + album)
    $(".songs [data-song-id].mdui-list-item-content").click(function() {
        playSongs(JSON.parse(songList), $(this).attr('data-song-id'))
        show_now()
    })
    $(".songs [data-song-id].add").click(function() {
        addSong(JSON.parse(songList), $(this).attr('data-song-id'))
    })
}
async function play_random() {
    var PARAMS_JSON = [
        { key: "additional", "value": "song_tag,song_audio,song_rating" },
        { key: "library", "value": "shared" },
        { key: "limit", "value": 100 },
        { key: "sort_by", "value": "random" }
    ]
    var data = await getAPI("AudioStation/song.cgi", "SYNO.AudioStation.Song", "list", PARAMS_JSON, 1)
    playSongs(data.data.songs, false, false)
    show_now()
}
//- 現正播放
async function show_now() {
    $('[data-link]').removeClass('mdui-list-item-active')
    $('[data-link="now"]').addClass('mdui-list-item-active')
    $("#title").text("現正播放")
    var html = `<ul class="mdui-list songs">`
    for (i = 0; i < ap.list.audios.length; i++) {
        let focus = ap.list.index == i ? 'mdui-list-item-active' : ''
        let title = ap.list.audios[i].name
        let artist = ap.list.audios[i].artist
        html += `<li class="mdui-list-item mdui-ripple song ${focus}" >
            <div class="mdui-list-item-content songinfo" data-now-play-id="${i}">
                <div class="mdui-list-item-title mdui-list-item-one-line">${title}</div>
                <div class="mdui-list-item-text mdui-list-item-one-line">${artist}</div>
            </div>
            <button class="mdui-btn mdui-btn-icon mdui-ripple close" data-now-play-id="${i}">
                <i class="mdui-icon material-icons">close</i>
            </button>
        </li>`　
    }
    html += `</ul>`

    var nowPlaying = ap.list.audios[ap.list.index]
    var name = nowPlaying ? nowPlaying.name : "PokaPlayer"
    var artist = nowPlaying ? nowPlaying.artist || "未知的歌手" : "點擊播放鍵開始隨機播放"
    var img = nowPlaying ? nowPlaying.cover : "https://i.imgur.com/ErJMEsh.jpg" //一定會有圖片
    var info = `
    <div data-player>
        <div class="mdui-card" style="background-image:url(${img});">
        </div>
        <div class="info">
            <div class="title  mdui-text-truncate">${name}</div>
            <div class="artist mdui-text-truncate">${artist}</div>
            <div class="grow"></div>
            <div class="ctrl">
                <button class="mdui-btn mdui-btn-icon mdui-ripple random"><i class="mdui-icon material-icons">skip_previous</i></button>
                <button class="mdui-btn mdui-btn-icon mdui-ripple" onclick="ap.skipBack()"><i class="mdui-icon material-icons">skip_previous</i></button>
                <button class="mdui-btn mdui-btn-icon mdui-ripple mdui-color-theme-accent play" onclick="ap.toggle()"><i class="mdui-icon material-icons">play_arrow</i></button>
                <button class="mdui-btn mdui-btn-icon mdui-ripple" onclick="ap.skipForward()"><i class="mdui-icon material-icons">skip_next</i></button>
                <button class="mdui-btn mdui-btn-icon mdui-ripple loop"><i class="mdui-icon material-icons">skip_previous</i></button>
            </div>
            <div class="player-bar">
                <label class="mdui-slider">
                    <input type="range" step="0.000001" min="0" max="100" value="0"/>
                </label>
                <div class="timer mdui-typo-body-1-opacity mdui-text-right">0:00/0:00</div>
            </div>
        </div>
    </div>`;
    // 輸出
    $("#content").html(`<div data-player-container>${info+html}</div>`);
    // 隱藏原本ㄉ播放器
    $("#player").addClass('hide');
    // random＆loop
    $("[data-player]>.info>.ctrl>.random").html($('.aplayer-icon.aplayer-icon-order').html())
    $("[data-player]>.info>.ctrl>.loop").html($('.aplayer-icon.aplayer-icon-loop').html())
    $("[data-player]>.info>.ctrl>.random").click(function() {
        $('#aplayer .aplayer-icon.aplayer-icon-order').click()
        $(this).html($('.aplayer-icon.aplayer-icon-order').html())
    })
    $("[data-player]>.info>.ctrl>.loop").click(function() {
        $('#aplayer .aplayer-icon.aplayer-icon-loop').click()
        $(this).html($('.aplayer-icon.aplayer-icon-loop').html())
    });
    //初始化滑塊
    mdui.mutation();
    // 確認播放鈕狀態
    if (ap.audio.paused)
        $('[data-player] button.play[onclick="ap.toggle()"] i').text("play_arrow")
    else
        $('[data-player] button.play[onclick="ap.toggle()"] i').text("pause")

    ap.on("pause", function() {
        $('[data-player] button.play[onclick="ap.toggle()"] i').text("play_arrow")
    })
    ap.on("play", function() {
        $(".songs>li.song").removeClass('mdui-list-item-active')
        $(".songs>li.song").eq(ap.list.index).addClass('mdui-list-item-active')
            //- 播放器

        $('[data-player] button.play[onclick="ap.toggle()"] i').text("pause")
        var nowPlaying = ap.list.audios[ap.list.index]
        var name = nowPlaying ? nowPlaying.name : "PokaPlayer"
        var artist = nowPlaying ? nowPlaying.artist || "未知的歌手" : "點擊播放鍵開始隨機播放"
        var img = nowPlaying ? nowPlaying.cover : "https://i.imgur.com/ErJMEsh.jpg" //一定會有圖片
        $('[data-player]>.mdui-card').attr('style', `background-image:url(${img});`)
        $('[data-player]>.info .title').text(name)
        $('[data-player]>.info .artist').text(artist)
            // 更新 timer
        $("[data-player]>.info>.player-bar input[type=range]").val(0);
        mdui.updateSliders()
    })
    ap.on("timeupdate", function() {
        currentTime = ap.audio.currentTime ? secondToTime(ap.audio.currentTime) : "0:00"
        duration = ap.audio.currentTime ? secondToTime(ap.audio.duration) : "0:00"
        var cent = ap.audio.currentTime / ap.audio.duration * 100
        $('[data-player]>.info>.player-bar>.timer').text(currentTime + '/' + duration);
        // 更新 timer
        if (!$('[data-player]>.info>.player-bar input[type=range]').is(":hover")) {
            $("[data-player]>.info>.player-bar input[type=range]").val(cent);
            mdui.updateSliders()
        }

    });

    $("[data-player]>.info>.player-bar input[type=range]").on("input", function() {
        var time = $("[data-player]>.info>.player-bar input[type=range]").val() / 100 * ap.audio.duration
        ap.seek(time);
    })

    $(".songs [data-now-play-id].songinfo").click(function() {
        $(".songs>li.song").removeClass('mdui-list-item-active')
        $(this).parent().eq(0).addClass('mdui-list-item-active')
        var song = $(this).attr('data-now-play-id')
        ap.list.switch(song)
        ap.play()
    })
    $(".songs [data-now-play-id].close").click(function() {
        var song = $(this).attr('data-now-play-id')
        ap.list.remove(song)
        show_now()
    })


}
//- 展示專輯歌曲
async function show_album_songs(artist, album, album_artist) {
    //如果從首頁按進去頁籤沒切換
    $('[data-link]').removeClass('mdui-list-item-active')
    $('[data-link="album"]').addClass('mdui-list-item-active')

    var data = await getAlbumSong(album, album_artist, artist),
        header = HTML_getHeader(album + (artist ? ' / ' + artist : '')),
        html = HTML_showSongs(data.data.songs)
    $("#content").html(header + html)
    $(".songs [data-song-id].mdui-list-item-content").click(function() {
        playSongs(JSON.parse(songList), $(this).attr('data-song-id'))
        show_now()
    })
    $(".songs [data-song-id].add").click(function() {
        addSong(JSON.parse(songList), $(this).attr('data-song-id'))
    })
    XBack.listen(function() {
        show_album()
    });
}


function playSongs(songlist, song = false, clear = true) {
    if (clear) ap.list.clear()
    var playlist = []
    var songtoplay = 0
    for (i = 0; i < songlist.length; i++) {
        let nowsong = songlist[i]
        let src = getSong(nowsong.id)
        let name = nowsong.title
        let artist = nowsong.additional.song_tag.artist
        let album = nowsong.additional.song_tag.album
        let poster = getSongCover(nowsong.id)
        playlist.push({
            url: src,
            cover: poster,
            name: name,
            artist: artist,
            album: album,
            id: nowsong.id
        })
        if (nowsong.id == song) { songtoplay = i }
    }
    ap.list.add(playlist)
    if (song) ap.list.switch(songtoplay)
    if (clear) ap.play()
}

function addSong(songlist, songID) {
    var playlist = []
    for (i = 0; i < songlist.length; i++) {
        let nowsong = songlist[i]
        if (nowsong.id == songID) {
            let src = getSong(nowsong.id)
            let name = nowsong.title
            let artist = nowsong.additional.song_tag.artist
            let album = nowsong.additional.song_tag.album
            let poster = getAlbumCover(album, nowsong.additional.song_tag.album_artist, artist)
            playlist.push({
                url: src,
                cover: poster,
                name: name,
                artist: artist,
                album: album,
                id: nowsong.id
            })
        }
    }
    ap.list.add(playlist)
    if (ap.list.audios.length == 1) ap.play() //如果只有一首直接開播
}

function getAlbumCover(album_name, album_artist_name, artist_name) {
    var url = "webapi/AudioStation/cover.cgi?api=SYNO.AudioStation.Cover&output_default=true&is_hr=false&version=3&library=shared&method=getcover&view=album"
    url += album_name ? `&album_name=${encodeURIComponent(album_name)}` : ``
    url += artist_name ? `&artist_name=${encodeURIComponent(artist_name)}` : ``
    url += album_artist_name ? `&album_artist_name=${encodeURIComponent(album_artist_name)}` : `&album_artist_name=`
    return '/nas/' + pp_encode(url)
}

function getSongCover(id) {
    var url = "webapi/AudioStation/cover.cgi?api=SYNO.AudioStation.Cover&output_default=true&is_hr=false&version=3&library=shared&method=getsongcover&view=large&id=" + id
    return '/nas/' + pp_encode(url)
}

function getSong(id, loadLowRes) {
    if (loadLowRes) {
        var url = "webapi/AudioStation/stream.cgi/0.wav?api=SYNO.AudioStation.Stream&version=2&method=transcode&format=wav&id=" + id
    } else {
        var url = "webapi/AudioStation/stream.cgi/0.mp3?api=SYNO.AudioStation.Stream&version=2&method=stream&id=" + id
    }
    return '/nas/' + pp_encode(url)
}
async function getAlbumSong(album_name, album_artist_name, artist_name) {
    var PARAMS_JSON = [
        { key: "additional", "value": "song_tag,song_audio,song_rating" },
        { key: "library", "value": "shared" },
        { key: "limit", "value": 100000 },
        { key: "sort_by", "value": "title" },
        { key: "sort_direction", "value": "ASC" },
    ]
    if (album_name) PARAMS_JSON.push({ key: "album", "value": album_name })
    if (album_artist_name) PARAMS_JSON.push({ key: "album_artist", "value": album_artist_name })
    if (artist_name) PARAMS_JSON.push({ key: "artist", "value": artist_name })
    var info = await getAPI("AudioStation/song.cgi", "SYNO.AudioStation.Song", "list", PARAMS_JSON, 3)
    return info
}

async function getAPI(CGI_PATH, API_NAME, METHOD, PARAMS_JSON = [], VERSION = 1) {
    var PARAMS = ''
    for (i = 0; i < PARAMS_JSON.length; i++) {　
        var PARAMS = PARAMS + '&' + PARAMS_JSON[i].key + '=' + encodeURIComponent(PARAMS_JSON[i].value)
    }
    var req_json = {
        "CGI_PATH": CGI_PATH,
        "API_NAME": API_NAME,
        "METHOD": METHOD,
        "VERSION": VERSION,
        "PARAMS": PARAMS
    }
    req_json = JSON.stringify(req_json)
    const response = await axios.get('/api/' + pp_encode(req_json));
    return response.data
}