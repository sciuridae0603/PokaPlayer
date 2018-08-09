// 初始化網頁
$(function() {
    var userPASS = window.localStorage["userPASS"]
    if (userPASS) {
        mdui.snackbar({
            message: '偵測到已儲存的密碼，正在嘗試登入',
            timeout: 1000
        });
        $.post("/login/", { userPASS: userPASS }, function(data) {
            if (data == 'success') {
                mdui.snackbar({ message: '登入成功', timeout: 1000 });
                document.location.href = "/";
            } else mdui.snackbar({ message: '登入失敗', timeout: 1000 });
        });
    }
});

function check() {

    $.post("/login/", { userPASS: $("#userPASS").val() }, function(data) {
        if (data == 'success') {
            mdui.snackbar({ message: '登入成功', timeout: 1000 });
            window.localStorage["userPASS"] = $("#userPASS").val()
            document.location.href = "/";
        } else mdui.snackbar({ message: '登入失敗', timeout: 1000 });
    });
    return false
}