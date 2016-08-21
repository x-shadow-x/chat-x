var app = angular.module('chatApp', []);
app.controller('indexCtrl', function($scope, $timeout) {
	

	// 连接服务器时显示loading遮罩层
	$scope.showHover = true;
	// 显示登陆框
	$scope.showLogin = true;
    $scope.isMsgEmpty = false;

    $scope.loadMore = function() {
        chat.socket.emit('loadMoreMsg');
    };

    $scope.sendMsg = function() {
        var $msg = $('#msg');
        var content = $msg.html();
        if(content === '') {
            $scope.isMsgEmpty = true;
            $timeout(function() {
                $scope.isMsgEmpty = false;
            }, 1000);
        } else {
            var data = {
                content: content,
                nickName: $scope.nickName
            }
            chat.socket.emit('sendMsg', data);

            var liDom = createDialog('dialog_box_mine', {content:content});
            appendToMsgList($msgBox, $msgList, liDom);
            $msg.html('');
        }
    };

    $scope.showEmoji = function(e) {
        if($('div.emoji_box').is(":hidden")){
            $('div.emoji_box').show();
        } else {
            $('div.emoji_box').hide();
        } 
    }

    $(document).click(function() {
        $('div.emoji_box').hide();
    })
    
    var $emojiBtn = $('#emojiBtn');

    $scope.addEmoji = function(e) {
        var src = e.target.src;
        if(!src) {// 弹出表情面板后用户没有点击中某个表情比如两个相邻表情的缝隙 ~则无法获得表情的路径 ~此时不做处理直接返回
            return;
        }
        var imgStr = '<img class="text_img" src="' + src + '">';
        var $msg = $('#msg');
        var content = $msg.html();

        if(content.indexOf('<div><br></div>') > -1) {// 一换行就选择表情符
            content = content.replace('<div><br></div>', '<div>' + imgStr + '</div>');
        } else {
            if(content.lastIndexOf('</div>') > -1) {// 换行后已经输入部分内容了，此时换行后输入的内容是被包在一个div中的 ~此时用户需要在同一行追加表情 ~需要表情插入到这个div中
                content = content.substring(0, content.lastIndexOf('</div>')) + imgStr + '</div>';
            } else {// 第一次在信息发送框中输入内容 ~这行内容是没有div包裹的 ~若此时想在句子末尾追加表情 ~则直接凭拼接
                content = content + imgStr;
            }
        }
        $msg.html(content);
    }

    $('#imgInput').change(function() {
        
        if(this.files.length !== 0) {
            var file = this.files[0];
            var reader = new FileReader();
            if(!reader) {
                alert('您的浏览器不支持fileReader');
                this.value = '';
                return;
            }
            console.log(file);
            reader.readAsDataURL(file);
            var width = 0;
            var height = 0;
            reader.onload = function(e) {// 图片数据读取成功
                this.value = '';
                var img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    width = this.width;
                    height = this.height;
                    chat.socket.emit('sendImg', {
                        content: e.target.result,
                        width: width,
                        height: height
                    });
                    var liDom = createDialog('dialog_box_mine', {
                        content: e.target.result,
                        width: width,
                        height: height
                    }, true);
                    appendToMsgList($msgBox, $msgList, liDom);
                }
                
            }
        }
    });

    var Chat = function() {
        this.socket = null;
    }

    /**
     * 考虑到没新增一个用户就需要执行一次初始化工作建立一次链接~故将初始化函数写为原型方法
     * @return {[type]} [description]
     */
    Chat.prototype.init = function() {

        this.socket = io.connect(); //建立连接

        this.socket.on('connect', function() {// connectn事件回调
            $('#hover').slideUp(320);
        });

        this.socket.on('nickExited', function() {
            alert('昵称已存在');
            $scope.nickName = '';
            $('#nickInput').focus();
        });

        this.socket.on('loginSucceed', function() {
        	$('#loginBox').fadeOut(320);
            $('#chatBox').fadeIn(320);
        });

        this.socket.on('system', function(msg) {
            // todo-------------系统消息
            var tipDom = createSysMsg(msg);
            appendToMsgList($msgBox, $msgList, tipDom);
        });

        this.socket.on('msgList', function(msgList) { // 请求显示的聊天数据

        });

        // 好友发送信息过来
        this.socket.on('receiveMsg', function(data) {
            var liDom = createDialog('dialog_box_others', data);
            appendToMsgList($msgBox, $msgList, liDom);
        });

        this.socket.on('reveiveImg', function(data) {
            var liDom = createDialog('dialog_box_others', data, true);
            appendToMsgList($msgBox, $msgList, liDom);
        });

        this.socket.on('emojiLists', function(data) {
            $scope.emojiLists = data;
            $scope.$digest();
        });
    }

    /**
     * 用户发送消息或接受到他人发送的消息时创建一个气泡框append到聊天信息显示区
     * dialogClass 若是自己发送的信息~li框类名为dialog_box_mine否则为dialog_box_other
     * data 将来会包括诸如发信息的用户的昵称，信息发送时间以及具体信息内容等字段~故是一个对象
     * 返回一个jquery对象
     */
    var createDialog = function(dialogClass, data, isImg) {
        var liDom = $('<li></li>');
            liDom.addClass(dialogClass);
            var innerHTML = '';
            if(isImg) {
                if(data.width < data.height) {// 竖图
                    innerHTML = '<div class="msg_img_box"><img class="vertial_img" src="' + data.content + '"></div><i class="user_icon"></i>';
                } else {
                    innerHTML = '<div class="msg_img_box"><img class="horizontal_img" src="' + data.content + '"></div><i class="user_icon"></i>';
                }
                
            } else {
                innerHTML =  '<span class="dialog">' + data.content + '</span><i class="user_icon"></i>';
            }
            
            liDom.html(innerHTML);
            return liDom;
    }

    var createSysMsg = function(msg) {
        var tipDom = $('<span class="sys_tip"></span>');
        tipDom.html(msg);
        return tipDom;
    }

    /**
     * 将接收到的消息或是自己发送的消息显示到信息显示区
     * $msgBox  调用滚动插件的盒子选择器
     * $msgList 信息列表盒子
     * $liDom   新加的对话气泡
     * time     将新信息添加到信息列表时需要将信息列表自动滚动到最底部~此处设置滚动时间
     */
    var appendToMsgList = function($msgBox, $msgList, liDom, time) {
        $msgList.append(liDom);
        $msgBox.animate({'scrollTop':$msgBox.prop('scrollHeight') - $msgBox.height()}, time || 320);
    }

    var chat = new Chat();
    chat.init();

    $scope.sendNick = function() {
    	var $nick = $('#nickInput');

        if (!$scope.nickName) {
            alert('昵称不能为空');
            $nick.focus();
        } else {
            chat.socket.emit('login', $scope.nickName);
        }
    }
    var $msgBox = $('#msgBox');
    $msgBox.perfectScrollbar();
    $('#textAreaBox').perfectScrollbar();
    $('#emojiContent').perfectScrollbar();

    var $msgList = $('#msgList');

    $('#userLoginIcon').mouseenter(function() {
        $('#changeHover').show();
    });

    $('#userLoginIcon').mouseleave(function() {
        $('#changeHover').hide();
    });

    // 滚动到顶部或底部的事件函数
    // $msgBox.scroll(function(e) {
    //     if($msgBox.scrollTop() === 0) {
    //         console.log('top');
    //       } else if ($msgBox.scrollTop() === $msgBox.prop('scrollHeight') - $msgBox.height()) {
    //         console.log('end');
    //       }
    // });

});