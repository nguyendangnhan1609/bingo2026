var { token } = sessionStorage;
var socket = io.connect(window.location.origin, {
  query: { token }
});

var autoRunFlg = false;
var stopCompleteFlg = false;
var timerFlg = false;

var showModalTimerFlg = false;
var soundRingsFlag = false;
var audio = new Audio();
var audio2 = new Audio();

//listen connect -- LUC MOI BAT DAU
socket.on("connect", function (data) {
  socket.emit("join", "User connect: ");
  // if (sessionStorage.getItem('token')) {
  socket.emit("check-token")
  // }
});

socket.on("send-next-number", function (data, delaySecond, status) {
  // console.log("send-next-number", data, delaySecond, status);
  // data.randomeList
  let html = data.randomeList.join(', ');
  $('#bingoNumberList').html(html);
});

$(document).ready(function () {
  var rad = document.formAdmin.mode;

  var prev = null;
  var raidoCurrent;
  //radio button checked or not
  checkRadioButton();
  for (var i = 0; i < rad.length; i++) {
    rad[i].addEventListener('change', function () {
      if (this !== prev) {
        prev = this;
      }
      raidoCurrent = this.value;
      if (this.value == 'autoRun') {
        $('#newGameTime').prop('disabled', true);
        $('#autoRestartTime').prop('disabled', false);
        autoRunFlg = true;
        stopCompleteFlg = false;
        timerFlg = false;
      } else if (this.value == 'stopComplete') {
        $('#newGameTime').prop('disabled', true);
        $('#autoRestartTime').prop('disabled', true);
        autoRunFlg = false;
        stopCompleteFlg = true;
        timerFlg = false;
      } else if (this.value == 'timer') {
        $('#newGameTime').prop('disabled', false);
        $('#autoRestartTime').prop('disabled', false);
        autoRunFlg = false;
        stopCompleteFlg = false;
        timerFlg = true;
      }
    });
  }

  // $('#autoRestartTime').required = true;
  document.getElementById("autoRestartTime").required = true;
});

function validateAutoRestartTime(idElement) {
  var isDisabled = $('#' + idElement).prop('disabled');
  var valueInput = $('#' + idElement).val();
  if (!isDisabled) {
    if (valueInput == '' || valueInput.length == 0) {
      $('#errAutoRestartTime').text('Không được rỗng!')
    }
    else if (!checkInputNumber(valueInput)) {
      $('#errAutoRestartTime').text('Định dạng không hợp lệ!')
    } else if (Number(valueInput) > 1440 || Number(valueInput) < 0) {
      $('#errAutoRestartTime').text('Phạm vi 1 ～ 1440')
    } else {
      $('#errAutoRestartTime').text('')
    }
  } else {
    $('#errAutoRestartTime').text('')
  }
}
function validateSpecialNumber(idElement) {
  var isDisabled = $('#' + idElement).prop('disabled');
  var valueInput = $('#' + idElement).val();
  if (!isDisabled) {
    if (valueInput == '' || valueInput.length == 0) {
      $('#errSpecialNumber').text('Không được rỗng!')
    }
    else if (!checkInputNumber(valueInput)) {
      $('#errSpecialNumber').text('Định dạng không hợp lệ!')
    } else if (Number(valueInput) > 100 || Number(valueInput) < 20) {
      $('#errSpecialNumber').text('Phạm vi 20 ～ 100')
    } else {
      $('#errSpecialNumber').text('')
    }
  } else {
    $('#errSpecialNumber').text('')
  }
}


function validateTotalWinner(idElement) {
  var valueInput = $('#' + idElement).val();
  if (valueInput == '' || valueInput.length == 0) {
    $('#errTotalWinner').text('Không được rỗng!')
  }
  else if (!checkInputNumber(valueInput)) {
    $('#errTotalWinner').text('Định dạng không hợp lệ!')
  } else {
    $('#errTotalWinner').text('')
  }
}

function checkInp() {

}

function login() {
  $("#login-notification").text("");
  let userId = $("#myInput").val();
  let pass = $("#pass").val();
  if (userId.length == 0 || userId == '') {
    $("#login-notification").text("Tên đăng nhập không được trống!");
  } else if (pass.length == 0 || pass == '') {
    $("#login-notification").text("Mật khẩu không được trống!");
  } else {
    socket.emit("check-login", userId, pass, userId);
  }
}

function pressLogin(e) {
  if (e.keyCode === 13) {
    e.preventDefault(); // Ensure it is only this code that runs
    login();
  }
}

socket.on("login-error", function () {
  loginFlag = false;
  $("#login-notification").text("Tên đăng nhập hoặc mật khẩu không đúng!");
});

socket.on("login-success", function (userId, username, token, formLogin, isAdmin) {
  if (isAdmin) {
    loginFlag = true;
    if (formLogin) {
      sessionStorage.setItem('token', token);
    }
    $("#login-notification").text("");
    $("#signin-box").addClass("hidden");
    $("#dashboard").removeClass("hidden");
    $('#username').text('Xin chào ' + username);
    socket.emit('historyWin', sessionStorage.getItem('token'));
  }
});

function logout() {
  // clearProgess();
  sessionStorage.removeItem('token');
  $("#signin-box").removeClass("hidden");
  $("#dashboard").addClass("hidden");
}
function reloadData() {
  socket.emit('reloadData', sessionStorage.getItem('token'));
}
function restartServer() {
  //play audio if not playing
  if(!soundRingsFlag) {
    soundRings();
  }

  var validateFlg = true;
  $('.errorInput').each(function () {
    if ($(this).text() != '' || $(this).text().length > 0) {
      validateFlg = false;
    }
  });
  if (validateFlg) {
    //show dialog loading
    checkRadioButton();
    $('#modal-loading').addClass('show-modal');
    // Set the date we're counting down to
    var newGameTime = $("#newGameTime").val();
    var arrTime = newGameTime.split(':');
    var countDownDate = new Date();
    if (timerFlg) {
      countDownDate.setHours(arrTime[0]);
      countDownDate.setMinutes(arrTime[1]);
      countDownDate.setSeconds(0);
    } else {
      countDownDate.setHours(0);
      countDownDate.setMinutes(0);
      countDownDate.setSeconds(0);
    }

    let autoRestartTime = $('#autoRestartTime').val();
    if (stopCompleteFlg) {
      autoRestartTime = 0
    }

    var countDownTime = countDownDate.getTime();
    let delaySecondClient = $("#nextNumberTime").val();
    //notification();
    var radioVer = document.getElementsByName('version');
    var version;
    for (var x of radioVer) {
      if (x.checked) {
        version = x.value
      }
    }

    var chatFlag = document.getElementsByName('chatFlag');
    var chat;
    for (var y of chatFlag) {
      if (y.checked) {
        chat = y.value
      }
    }

    var bingoCard = document.getElementsByName('bingoCard');
    var bingoCardVal;
    for (var z of bingoCard) {
      if (z.checked) {
        bingoCardVal = z.value
      }
    }
    let totalWinner = $('#totalWinner').val();
    let specialNumber = $('#specialNumber').val();

    //Thành: thêm mã số vòng chơi
    let gameCode = $('#gameCode').val();

    //clear lstWinnerLocal
    lstWinnerLocal = [];
    clearTest();

    localStorage.setItem("timeRestart", "timeRestart");
    socket.emit("restart-server", countDownTime, delaySecondClient, version, chat, sessionStorage.getItem('token'), totalWinner, autoRestartTime, bingoCardVal, specialNumber, gameCode);
  } else {
    alert('validate');
  }
}

function notification() {
  $('#modal-loading').addClass('show-modal');
  notifiMess = $("#notification").val();
  $("#notification").val("");
  socket.emit("admin-notificate-all", notifiMess, sessionStorage.getItem('token'));
}

function enterNotification(e) {
  if (e.keyCode == 13) {
    notification();
    e.preventDefault();
  }
}

// let idx = 1;
socket.on('restart', function (serverStatus, upTime, restartFlag) {
  if (restartFlag) {
    //hidden dialog loading 
    $('#modal-loading').removeClass('show-modal');    
    
    //Thành: xóa đếm ngược
    // $('.countDownRestart').text(0);
  }
  if (upTime != 0) {
    $('#modal-loading').removeClass('show-modal');
    // if(idx == 1) {
    //   const el = document.querySelector('#modal-timer');
    //   const cl = el.classList;
    //   cl.add('show-modal');
    //   idx++
    // }
    //Thành: xóa đếm ngược
    // $('.countDownRestart').text(upTime);
  }
})

//đóng dialog
function closeModal(id) {
  let el;
  switch (id) {
    case 'modal-mess':
      el = document.querySelector('#modal-mess');
      break;
    case 'modal-timer':
      el = document.querySelector('#modal-timer');
      break;
    case 'modal-notification':
      el = document.querySelector('#modal-notification');
      break;
  }
  el.classList.remove('show-modal');
}

socket.on('lstWinner', function (lstWinner, endGameFlg) {
  // lstWinnerReverse = lstWinner.reverse(); // đảo ngược mảng
  lstWinnerReverse = lstWinner;
  let html = ''
  lstWinnerReverse.forEach((el, idx) => {
    idx++
    if (idx < 10) idx = '0' + idx;
    html += '<p>' + idx + '. [' + el.time + '] <span class="dataName">' + el.name + '</span> [' + el.bingoNumbers + ']</p>';
  });
  $('#winnerList').html(html);
  playAudio2("soundVictory");
});

socket.on('ERROR', function (msg) {
  $('#modal-loading').removeClass('show-modal');
  $("#signin-box").removeClass("hidden");
  $("#login-notification").text("");
  $("#dashboard").addClass("hidden");
  alert(msg);
})

function clearTest() {
  socket.emit('clearLstWinner', sessionStorage.getItem('token'));
}

function checkRadioButton() {
  if ($("#autoRun").prop("checked")) {
    $('#newGameTime').prop('disabled', true);
    $('#autoRestartTime').prop('disabled', false);
    autoRunFlg = true;
    stopCompleteFlg = false;
    timerFlg = false;
  } else if ($("#stopComplete").prop("checked")) {
    $('#newGameTime').prop('disabled', true);
    $('#autoRestartTime').prop('disabled', true);
    autoRunFlg = false;
    stopCompleteFlg = true;
    timerFlg = false;
  } else if ($("#timer").prop("checked")) {
    $('#newGameTime').prop('disabled', false);
    $('#autoRestartTime').prop('disabled', false);
    autoRunFlg = false;
    stopCompleteFlg = false;
    timerFlg = true;
  }
}

socket.on('notificate-all', (notication) => {
  $('#modal-loading').removeClass('show-modal');
})

function checkInputNumber(x) {
  var regex = /^[0-9]+$/;
  // x = Number(x);
  if (x.match(regex)) {
    return true;
  } else {
    return false;
  }
}

function playBingo() {
  //play sound if not playing
  // if(!soundRingsFlag) {
  //   playAudioWithRepeat("soundTrack");
  //   $("#soundBtn").text("Pause Sound");
  //   soundRingsFlag = true;
  // }
  
  $("#pauseBingo").removeClass("hidden");
  $("#playBingo").addClass("hidden");
  socket.emit("run-server", true, sessionStorage.getItem('token'));
}

function pauseBingo() {
  //pause sound if playing
  // if(soundRingsFlag) {
  //   stopAudio("soundTrack");
  //   $("#soundBtn").text("Play Sound");
  //   soundRingsFlag = false;
  // }
  $("#pauseBingo").addClass("hidden");
  $("#playBingo").removeClass("hidden");
  socket.emit("run-server", false, sessionStorage.getItem('token'));
}

function soundRings() {
  if (!soundRingsFlag) {
    playAudioWithRepeat("soundTrack");
    $("#soundBtn").text("Pause Sound");
    soundRingsFlag = true;
  } else {
    stopAudio("soundTrack");
    $("#soundBtn").text("Play Sound");
    soundRingsFlag = false;
  }  
}

function playAudio(filename) {
  audio.src = "./audio/" + filename + ".mp3";
  audio.autoplay = true;
  audio.load();
  audio.addEventListener("load", function () {
    audio.play();
  }, true);
}
function playAudio2(filename) {
  audio2.src = "./audio/" + filename + ".mp3";
  audio2.autoplay = true;
  audio2.load();
  audio2.addEventListener("load", function () {
    audio2.play();
  }, true);
}

function playAudioWithRepeat(filename) {
  audio.src = "./audio/" + filename + ".mp3";
  audio.autoplay = true;
  audio.load();
  audio.addEventListener("ended", function () {
    this.currentTime = 0;
    this.play();
  }, true);
}

function stopAudio(filename) {
  audio.src = "./audio/" + filename + ".mp3";
  audio.pause();
  audio.currentTime = 0;
}