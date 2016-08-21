var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var socketIo = require('socket.io');
var io = socketIo.listen(server);
var images = require('images');
var os = require('os');
var fs = require("fs");

app.use('/', express.static(__dirname + '/www'));
server.listen(8080);

var userList = [];

function resize_image(orignalPath, width, height, disPath) {
    var image = images(orignalPath);
    var orignalW = image.width();
    var orignalH = image.height();
    // 若图像不符合指定的尺寸~则需剪裁~x、y为剪裁的左上角坐标
    var x = y = 0;
    if (orignalW > orignalH) { // 横图~先将图片按指定高度缩放~再剪裁
        image = image.resize(height * (orignalW / orignalH), height);
        x = (image.width() - width) / 2;
    } else { // 方图或竖图直接按指定宽度先缩放
        image = image.resize(width);
        y = (image.height() - height) / 2;
    }
    images(image, x, y, width, height).save(disPath);
}

function geFileList(path) {
    var filesList = [];
    // var ip = getIP();
    readFile(path, filesList, './content/images/face_icon/');
    return filesList;
}

function readFile(path, filesList, relativeDir) {
    files = fs.readdirSync(path); //需要用到同步读取
    files.forEach(walk);

    function walk(file) {
        states = fs.statSync(path + '/' + file);
        if (states.isDirectory()) {
            readFile(path + '/' + file, filesList);
        } else {
            //创建一个对象保存信息
            var obj = new Object();
            obj.name = file; //文件名
            obj.path = relativeDir + file; //文件绝对路径
            filesList.push(obj);
        }
    }
}

function getIP() {
    console.log(os.networkInterfaces());
    for (var i = 0; i < os.networkInterfaces().eth0.length; i++) {
        if (os.networkInterfaces().eth0[i].family == 'IPv4') {
            return (os.networkInterfaces().eth0[i].address);
        }
    }
}

var emojiLists = geFileList('./www/content/images/face_icon/');

io.on('connection', function(socket) {
    //接收并处理客户端发送的foo事件
    socket.on('login', function(nickName) {

        if (userList.indexOf(nickName) > -1) {
            socket.emit('nickExited');
        } else {
            socket.userIndex = userList.length;
            socket.nickName = nickName;
            userList.push(nickName);
            socket.emit('loginSucceed');
            io.sockets.emit('system', 'system: ' + socket.nickName + ' login'); // 向所有连接客户发送新用户加入的信息~io表示服务器整个socket连接
            socket.emit('emojiLists', emojiLists);
        }
    });
    socket.on('disconnect', function() {
        if (typeof(socket.userIndex) === 'undefined') {
            // socket的index为undefined~说明用户还未登陆~~只是刷新~若执行userList.splice(socket.userIndex, 1);会导致删除用户数组的第一项~此时不应该删除用户数组中的用户
            return;
        }
        userList.splice(socket.userIndex, 1);
        io.sockets.emit('system', 'system: ' + socket.nickName + ' logout');
    });
    socket.on('loadMoreMsg', function() {

    });
    // 收到用户发来的信息，将其广播给其他所有的用户
    socket.on('sendMsg', function(data) {
        socket.broadcast.emit('receiveMsg', data);
    });
    socket.on('sendImg', function(data) {
        // resize_image(data, 320, 320,null,80, null);
        socket.broadcast.emit('reveiveImg', data);
        saveImg(data.content);
        // socket.broadcast.emit('receiveImg', data);
    });
});

function saveImg(data) {
    var imgData = data.split('base64,');
    //过滤data:URL
    var imgTitleMsg = imgData[0];
    var base64Data = imgData[1];
    var typeList = ['jpeg', 'jpg', 'gif', 'png'];

    // 默认样式为jpeg
    var imgType = 'jpeg';
    for (var i = 0, len = typeList.length; i < len; i++) {
        if (imgTitleMsg.indexOf(typeList[i]) > -1) {
            imgType = typeList[i];
            break;
        }
    }

    // 将base64形式的图片写到指定文件夹下保存
    var date = new Date().getTime();
    var orignalFilePath = "server_img/" + date + '.' + imgType;
    var compressFilePath = "server_img/" + date + 'min.' + imgType;
    var dataBuffer = new Buffer(base64Data, 'base64');
    fs.writeFile(orignalFilePath, dataBuffer, function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log("保存成功！");
            // if(imgType != 'gif') { // node-images 不支持gif的编码 ~无法做图片的剪裁
            //   resize_image(orignalFilePath, 100, 100, compressFilePath);
            // }
        }
    });
}
console.log('server is started');
