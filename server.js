// Declaring GLOBAL vars
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var fs = require("fs");
var process = require("process");
const { clearInterval } = require("timers");
const jwt = require("jsonwebtoken");
const secret =
  "fd3d9iS9Ner1d8L8Y08KTYNCXVOK6eWIH3UO98bf7pcd2eu1yJhEec9P4H1JE5m";

var userList; //Đọc từ file data.json
var sendUserList; //Đọc từ file data.json
var bingoCardListVer75; ///Đọc từ file data-client.json
var bingoCardListVer50; ///Đọc từ file data-client-v50.json
var serverStatus = {};
var clientList = [];
var messList = [];
var bingoFlag = false;
var bingoMess = "";
var chatFlag = true;
var runFlag = true;
var delaySecond = 10;
var automaticTime = 180;
var automaticTimeOut;
var timer;
var counter;

var adminToken;
var adminId = "Admin";
var maxLength = 250;
var idUser = [];
var lstIdUser;
var lengthLstUser;
var version = "ver75";
var maxChatListLeng = 20;

var restartAutoFlag = true;
var loginFlag = false;
// var ldap = require('ldapjs');
const { log } = require("console");
var emojiAniList = [];

var countWinner = 0;
var totalWinner = 1;
var endGameFlg = false;

var randomBingoCardFlg = true;

var specialNumber = 30; //giới hạn số lượng số đặc biệt
//lịch sử chiến thắng
lstWinner = [];

//Thành: thêm mã số vòng chơi
var gameCode = "";

process.on("SIGINT", () => {
  console.info("Interrupted");
  process.exit(0);
});

//----------------var Random Bingo Card--------------------------
var randomeList = [getNextNumber()];
var numsB = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var numsI = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
var numsN = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
var numsG = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
var numsO = [41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
var gen_nums = [];
var dataBingoCardRandom = {};
var lstBingoCardRandom = [];
var dataB = [];
var dataI = [];
var dataN = [];
var dataG = [];
var dataO = [];

//ver75
var numsBV75 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
var numsIV75 = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
var numsNV75 = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
var numsGV75 = [46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
var numsOV75 = [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75];

//ver100
let loop = 20;
var numsBV100 = [];
for (let i = 0; i < loop; i++) {
  numsBV100.push(i + loop * 0);
}
var numsIV100 = [];
for (let i = 0; i < loop; i++) {
  numsIV100.push(i + loop * 1);
}
var numsNV100 = [];
for (let i = 0; i < loop; i++) {
  numsNV100.push(i + loop * 2);
}
var numsGV100 = [];
for (let i = 0; i < loop; i++) {
  numsGV100.push(i + loop * 3);
}
var numsOV100 = [];
for (let i = 0; i < loop; i++) {
  numsOV100.push(i + loop * 4);
}
fs.readFile("./public/data/data.json", "utf8", function (err, data) {
  if (err) throw err;
  userList = JSON.parse(data);
  sendUserList = userList.map((user) => {
    return {
      id: user.id,
      name: user.name,
      user: user.user,
    };
  });
  lstIdUser = userList.map((user) => {
    return {
      id: user.id,
    };
  });
  lengthLstUser = lstIdUser.length;
});

// fs.readFile("./public/data/data-client.json", "utf8", function (err, data) {
//   if (err) throw err;
//   bingoCardListVer75 = JSON.parse(data);
// });

// fs.readFile("./public/data/data-client-v50.json", "utf8", function (err, data) {
//   if (err) throw err;
//   bingoCardListVer50 = JSON.parse(data);
// });

fs.readFile(
  "./public/data/emojiAnimationList.json",
  "utf-8",
  function (err, data) {
    if (err) throw err;
    emojiAniList = JSON.parse(data);
  }
);

//default
app.use(express.static("public"));

//admin
app.get("/admin@", (req, res) => {
  res.sendfile("./public/admin/admin.html");
});

//menu
app.get("/menu", (req, res) => {
  res.sendfile("./public/menu.html");
});

//guider
app.get("/guider", (req, res) => {
  res.sendfile("./public/guider.html");
});

timer = setInterval(sendNextNumber, delaySecond * 1000);

io.on("connection", function (client) {
  //gửi khi kết nối
  let ip = client.conn.remoteAddress.replace("::ffff:", "");
  let data = { ip: ip, randomeList: randomeList, version: version };
  client.emit("send-next-number", data, delaySecond, "init");
  client.emit("send-mess-list", messList);
  client.emit("send-mess-list-box", messList);
  client.emit("send-user-list", sendUserList);
  client.emit("server-status", {
    bingoFlag: bingoFlag,
    bingoMess: bingoMess,
    totalWinners: totalWinner,
  });
  client.emit("send-emoji-list", emojiAniList);
  client.emit("run-client", runFlag, adminToken);
  client.on("run-server", function (flag, token) {
    if (!checkInput(flag) || !checkInput(token) || adminToken != token) {
      return;
    }
    runFlag = flag;
    client.emit("run-client", runFlag, adminToken);
    client.broadcast.emit("run-client", runFlag, adminToken);
  });
  client.emit("lstWinner", lstWinner, endGameFlg);
  // Khi nhận được yêu cầu chạy lại server từ ADMIN
  client.on(
    "restart-server",
    function (
      countDownTime,
      delaySecondClient,
      ver,
      chat,
      token,
      reqtotalWinner,
      reqAutoRestartTime,
      reqBingoCardVal,
      reqSpecialNumber,
      reqGameCode
    ) {
      if (
        !checkInput(countDownTime) ||
        !checkInput(delaySecondClient) ||
        !checkInput(ver) ||
        !checkInput(token)
      ) {
        return;
      }
      if (adminToken != token) {
        return client.emit(
          "ERROR",
          "[restart-server]: không có quyền thực hiện chức năng"
        );
      }
      specialNumber = reqSpecialNumber;
      version = ver;
      let chatStatus;
      if (chat == "true") {
        chatFlag = true;
        chatStatus = "- Cho phép chat: ON.";
      } else {
        chatFlag = false;
        chatStatus = "- Cho phép chat: OFF.";
      }
      //kiểm tra thời gian chờ giữa các lượt
      if (reqAutoRestartTime > 0) {
        automaticTime = reqAutoRestartTime * 60;
      } else {
        automaticTime = 0;
      }
      //overwrite autoRestart
      client.emit("autoRestart", 0);
      client.broadcast.emit("autoRestart", 0);
      restartAutoFlag = false;
      clearTimeout(automaticTimeOut);

      //bộ số cố định hoặc random
      reqBingoCardVal == "random"
        ? (randomBingoCardFlg = true)
        : (randomBingoCardFlg = false);

      if (randomBingoCardFlg) {
        randomBingoCard(version);
      }

      //update totalWinner
      countWinner = 0;
      totalWinner = Number(reqtotalWinner);
      let warning =
        totalWinner == 1
          ? "Lưu ý: Chỉ một người chơi duy nhất giành chiến thắng và trò chơi sẽ dừng lại."
          : "Lưu ý: Đạt giới hạn người chơi giành chiến thắng trò chơi sẽ dừng lại.";
      let countDownTimeLocal = new Date(countDownTime).toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      });
      let dateLocal = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      });
      let countDownDate = new Date(countDownTimeLocal);
      let nowDate = new Date(dateLocal);
      let timeRestart =
        nowDate.getTime() > countDownDate.getTime()
          ? "Trò chơi đã được khởi động lại."
          : "Trò chơi đã được đặt lịch khởi động lại lúc " +
            formatDate(countDownDate) +
            ".";
      let bingoCardMess = randomBingoCardFlg
        ? "- Bộ số random."
        : "- Bộ số cố định.";

      //Thành: thêm mã số vòng chơi
      gameCode = reqGameCode;
      let gameCodeMess = reqGameCode
        ? "- Mã số vòng chơi: <b>" + reqGameCode + "</b>.<br>"
        : "";
      let restartMess = {
        ip: "Thông báo",
        user: "Thông báo",
        data:
          timeRestart +
          "<br>" +
          gameCodeMess +
          "- Phiên bản trò chơi: " +
          ver +
          ".<br>" +
          bingoCardMess +
          "<br>" +
          "- Thời gian quay số là: " +
          delaySecondClient +
          " giây." +
          "<br>" +
          chatStatus +
          "<br>" +
          "- Số người chiến thắng là: " +
          totalWinner +
          " người." +
          "<br>" +
          "- Giới hạn số cho Double/Triple: <b>" +
          specialNumber +
          "</b> số.<br> <i>" +
          warning +
          "</i><br>" +
          "Chúc các bạn may mắn !!!",
        time: formatDate(nowDate),
      };
      messList.push(restartMess);
      if (messList.length == maxChatListLeng + 1) {
        messList.shift();
      }
      client.emit("send-mess-list", messList, loginFlag);
      client.broadcast.emit("send-mess-list", messList, loginFlag);
      client.emit("send-mess-list-box", messList, loginFlag);
      client.broadcast.emit("send-mess-list-box", messList, loginFlag);

      clearInterval(counter);
      //udpate delaySecond from admin:
      delaySecond = delaySecondClient;
      // Update the count down every 1 second
      counter = setInterval(function () {
        // Get today's date and time
        var now = new Date().getTime();
        // Find the distance between now and the count down date
        var distance = countDownTime - now;
        client.emit("restart", distance, false, delaySecond);
        client.broadcast.emit("restart", distance, false, delaySecond);
        // If the count down is over
        if (distance < 0) {
          clearInterval(counter);
          counter = null;
          bingoFlag = false;
          restartAutoFlag = true;
          randomeList = [];
          client.emit("restart", 0, true, version, delaySecond);
          client.broadcast.emit("restart", 0, true, version, delaySecond);
          //restart send number
          clearInterval(timer);
          timer = setInterval(sendNextNumber, delaySecond * 1000);
        }
      }, 1000);
    }
  );

  // LISTENT ON CLIENT ===========================================================================
  //Khi admin gửi notification to all user
  client.on("admin-notificate-all", function (notifiMess, token) {
    if (!checkInput(notifiMess) || !checkInput(token) || token != adminToken) {
      return;
    }
    serverStatus.notifiMess = notifiMess;
    client.emit("notificate-all", notifiMess);
    client.broadcast.emit("notificate-all", notifiMess);
  });

  //Khi người dùng join
  client.on("join", function (data) {
    if (!checkInput(data)) {
      return;
    }
    clientList.push(client);
    serverStatus.onlineUser = clientList.length;
    serverStatus.version = version;
    client.emit("update-status", serverStatus);
    client.broadcast.emit("update-status", serverStatus);
  });

  //Khi người dùng ngắt kết nối
  client.on("disconnect", function () {
    clientList = clientList.filter((cli) => cli.conn.id !== client.conn.id);
    serverStatus.onlineUser = clientList.length;
    client.broadcast.emit("update-status", serverStatus);
  });

  //gửi khi nhận được thông tin messages submit
  client.on("chat-messages", function (data) {
    //console.log(data);
    if (!checkInput(JSON.stringify(data)) || !chatFlag) {
      return;
    }
    let mess;
    let dataMess = data.mess;
    if (data.base64 !== undefined) {
      mess = {
        ip: client.conn.remoteAddress.replace("::ffff:", ""),
        user: data.user,
        data: data.base64,
        mineType: data.type,
        time: data.time,
      };
    } else {
      mess = {
        ip: client.conn.remoteAddress.replace("::ffff:", ""),
        user: data.user,
        data: convertCharactToEmoji(dataMess, data.src),
        time: data.time,
        src: data.src,
      };
    }

    messList.push(mess);
    if (messList.length == maxChatListLeng + 1) {
      messList.shift();
    }
    client.emit("send-mess-list", messList, loginFlag);
    client.broadcast.emit("send-mess-list", messList, loginFlag);
    client.emit("send-mess-list-box", messList, loginFlag);
    client.broadcast.emit("send-mess-list-box", messList, loginFlag);
  });

  //gửi khi nhận được thông tin trúng thưởng
  client.on("bingo-user", function (dataBingo) {
    //console.log("dataBingo", dataBingo);
    if (!checkInput(dataBingo)) return;
    let checkBingoError = dataBingo.bingoNumbers.some(
      (e) => checkBingoNum(e, dataBingo.token) == false
    );
    //console.log(
    //   "checkBingoError",
    //   !dataBingo,
    //   checkBingoError,
    //   !dataBingo || checkBingoError
    // );

    if (!dataBingo || checkBingoError) {
      if (!dataBingo)
        if (checkBingoError)
          //console.log("Error: dataBingo không hợp lệ");
          //console.log("Error: checkBingoError không hợp lệ");
          return;
    }
    let winner;
    let fullName;
    jwt.verify(dataBingo.token, secret, function (err, decoded) {
      if (err) {
        //console.log("verify dataBingo.token không đúng ! ");
        return;
      }
      fullName = decoded.name;
    });

    // 20250512 nếu lstWinner đã có tồn tại dataBingo.name thì không trúng
    let checkExists =
      lstWinner && lstWinner.some((user) => user.name === dataBingo.name);
    if (checkExists) {
      //console.log("User này đã tồn tại trong danh sách chiến thắng ! ");
      return;
    }

    if (dataBingo && !bingoFlag) {
      let bingoNumbers = dataBingo.bingoNumbers;
      loginFlag = true;
      countWinner++;
      endGameFlg = countWinner == totalWinner ? true : false;

      //content win
      bingoNotification = {
        ip: "Thông báo",
        user: "Thông báo",
        data: fullName,
        time: dataBingo.time,
        bingoNumbers: bingoNumbers,
      };

      //message win
      let bingo;
      switch (bingoNumbers.length) {
        case 2:
          bingo = "Double Bingo";
          break;
        case 3:
          bingo = "Triple Bingo";
          break;
      }
      let bingoSpecialMsg = {
        ip: "Thông báo",
        user: "Thông báo",
        data: `Xin chúc mừng <b>${fullName}</b> đã trúng <b><u>phần thưởng đặc biệt ${bingo}</u></b> với các số: <b>[${dataBingo.bingoNumbers}]</b> ở lần quay số thứ <b>${randomeList.length}</b>. <br>`,
        time: dataBingo.time,
      };
      let bingoMsg = {
        ip: "Thông báo",
        user: "Thông báo",
        data: `Xin chúc mừng <b>${fullName}</b> đã vượt <b>${clientList.length}</b> người và giành <b><u>Giải ${countWinner}</u></b> với các số: <b>[${dataBingo.bingoNumbers}]</b> ở lần quay số thứ <b>${randomeList.length}</b>. <br>
        `,
        time: dataBingo.time,
      };
      //giới hạn dòng tin nhắn
      messList.push(
        bingoNumbers.length > 1 && randomeList.length <= specialNumber
          ? bingoSpecialMsg
          : bingoMsg
      );
      if (messList.length == maxChatListLeng + 1) {
        messList.shift();
      }

      winner = {
        index: lstWinner.length + 1,
        id: dataBingo.id,
        name: dataBingo.name,
        time: dataBingo.dateTime,
        bingoNumbers: bingoNumbers,
      };
      //thêm vào lịch sử chiến thắng
      lstWinner.push(winner);

      //cập nhật lịch sử chiến thắng
      client.emit("lstWinner", lstWinner, endGameFlg);
      client.broadcast.emit("lstWinner", lstWinner, endGameFlg);

      //show dialog winner
      client.emit(
        "update-winner",
        bingoNotification,
        restartAutoFlag,
        endGameFlg,
        true
      );
      client.broadcast.emit(
        "update-winner",
        bingoNotification,
        restartAutoFlag,
        endGameFlg,
        false
      );

      //show message winner
      client.emit("send-mess-list", messList, loginFlag);
      client.broadcast.emit("send-mess-list", messList, loginFlag);
      client.emit("send-mess-list-box", messList, loginFlag);
      client.broadcast.emit("send-mess-list-box", messList, loginFlag);

      //thực hiện khối code khi số người thắng = giới hạn số người thắng
      if (endGameFlg) {
        bingoFlag = true;
        countWinner = 0;
        if (restartAutoFlag) {
          //yêu cầu client hiển thị đếm ngược
          client.emit("autoRestart", automaticTime / 60);
          client.broadcast.emit("autoRestart", automaticTime / 60);
          //restart game sau 3 phút
          clearTimeout(automaticTimeOut);
          if (automaticTime > 0) {
            automaticTimeOut = setTimeout(function () {
              bingoFlag = false;
              randomeList = [];
              if (randomBingoCardFlg) randomBingoCard(version);
              // delaySecond = 10;
              clearInterval(timer); //clear thời gian quay số
              timer = setInterval(sendNextNumber, delaySecond * 1000); // set thời gian quay số về mặc định(10s)
              client.emit("restart", 0, true, version, delaySecond);
              client.broadcast.emit("restart", 0, true, version, delaySecond);
            }, automaticTime * 1000);
          }
        }
      }
    }
  });

  //check password
  client.on("check-login", function (userId, pass, username) {
    if (!checkInput(userId) || !checkInput(pass) || !checkInput(username)) {
      return;
    }
    if (username == "" || pass == "") {
      client.emit("login-error");
    } else {
      // check login bằng data.json
      let result = userList.find((u) => {
        return u.id === userId && u.pass === pass;
      });
      if (result) {
        loginFlag = true;
        const token = jwt.sign(
          { id: userId, name: username, pass: pass },
          secret,
          { expiresIn: "100d" }
        );
        formLogin = true;
        let isAdmin = false;
        if (
          userId.toLowerCase() == adminId.toLowerCase() ||
          userId.toLowerCase() == "BRYCENAD9999".toLowerCase()
        ) {
          adminToken = token;
          isAdmin = true;
        }
        client.emit(
          "login-success",
          userId,
          username,
          token,
          formLogin,
          isAdmin
        );
        client.emit("user-connect", userId, username);
        client.broadcast.emit("user-connect", userId, username);
        // clientLDAP.destroy();
        client.emit("send-mess-list", messList, loginFlag);
        client.emit("send-mess-list-box", messList, loginFlag);
        client.emit("server-status", {
          bingoFlag: bingoFlag,
          bingoMess: bingoMess,
          totalWinners: totalWinner,
        });
        // } else {
        //   //xác thực bằng ldap
        //   let clientLDAP = ldap.createClient({
        //     // url: "ldap://192.168.1.251:389", //ldap-old
        //     url: "ldap://192.168.249.3:389",
        //     reconnect: false
        //   });
        //   let dn = 'CN=' + username + ',CN=Users,DC=brycen-vn,DC=local';
        //   let formLogin;
        //   clientLDAP.bind(dn, pass, function (err) {
        //     if (err) {
        //       client.emit("login-error");
        //       clientLDAP.destroy();
        //     } else {
        //       loginFlag = true;
        //       const token = jwt.sign({ id: userId, name: username, pass: pass }, secret, { expiresIn: '100d' });
        //       formLogin = true;
        //       client.emit("user-connect", userId, username);
        //       client.broadcast.emit("user-connect", userId, username);
        //       client.emit("login-success", userId, username, token, formLogin);
        //       clientLDAP.destroy();
        //       client.emit("send-mess-list", messList, loginFlag);
        //       client.emit("send-mess-list-box", messList, loginFlag);
        //     }
        //   });
      }
    }
  });

  // client.on("check-login", function (userId, pass, username) {
  //   if (!checkInput(userId) || !checkInput(pass) || !checkInput(username)) {
  //     return;
  //   }
  //   if (username == "" || pass == "") {
  //     client.emit("login-error");
  //   } else {
  //     //xác thực bằng ldap
  //     let clientLDAP = ldap.createClient({
  //        // url: "ldap://192.168.1.251:389", //ldap-old
  //        url: "ldap://192.168.249.3:389",
  //       reconnect: false
  //     });
  //     let dn = 'CN=' + username + ',CN=Users,DC=brycen-vn,DC=local';
  //     let formLogin;
  //     clientLDAP.bind(dn, pass, function (err) {
  //       if (err) {
  //         //nếu không có trong ldap --> check login bằng data.json
  //         let result = userList.find(u => {
  //           return u.id === userId && u.pass === pass;
  //         });
  //         if (result) {
  //           loginFlag = true;
  //           const token = jwt.sign({ id: userId, name: username, pass: pass }, secret, { expiresIn: '100d' });
  //           formLogin = true;
  //           let isAdmin = false;
  //           if (userId.toLowerCase() == adminId.toLowerCase()
  //             || userId.toLowerCase() == 'BRYCENAD9999'.toLowerCase()) {
  //             adminToken = token;
  //             isAdmin = true
  //           }
  //           client.emit("login-success", userId, username, token, formLogin, isAdmin);
  //           client.emit("user-connect", userId, username);
  //           client.broadcast.emit("user-connect", userId, username);
  //           clientLDAP.destroy();
  //           client.emit("send-mess-list", messList, loginFlag);
  //           client.emit("send-mess-list-box", messList, loginFlag);
  //           client.emit("server-status", { bingoFlag: bingoFlag, bingoMess: bingoMess, totalWinners: totalWinner });
  //         } else {
  //           client.emit("login-error");
  //           clientLDAP.destroy();
  //         }
  //       } else {
  //         loginFlag = true;
  //         const token = jwt.sign({ id: userId, name: username, pass: pass }, secret, { expiresIn: '100d' });
  //         formLogin = true;
  //         client.emit("user-connect", userId, username);
  //         client.broadcast.emit("user-connect", userId, username);
  //         client.emit("login-success", userId, username, token, formLogin);
  //         clientLDAP.destroy();
  //         client.emit("send-mess-list", messList, loginFlag);
  //         client.emit("send-mess-list-box", messList, loginFlag);
  //       }
  //     });
  //   }
  // });

  client.on("change-user", function (userId, restartFlag) {
    if (!checkInput(userId) || !checkInput(restartFlag)) {
      return;
    }
    let bingoCard;
    loginFlag = false;
    if (!randomBingoCardFlg) {
      if (version == "ver75") {
        bingoCard = bingoCardListVer75.find((card) => card.staffid === userId);
      } else {
        bingoCard = bingoCardListVer50.find((card) => card.staffid === userId);
      }
    } else {
      bingoCard = lstBingoCardRandom.find((card) => card.staffid === userId);
    }
    if (!restartFlag) {
      client.emit("send-mess-list", messList, loginFlag);
      client.emit("send-mess-list-box", messList, loginFlag);
    }
    client.emit("bingo-card-receive", bingoCard);
  });

  client.on("reset-bingo-card", function (userId) {
    if (!checkInput(userId)) {
      return;
    }
    let bingoCard;
    if (!randomBingoCardFlg) {
      if (version == "ver75") {
        bingoCard = bingoCardListVer75.find((card) => card.staffid === userId);
      } else {
        bingoCard = bingoCardListVer50.find((card) => card.staffid === userId);
      }
    } else {
      bingoCard = lstBingoCardRandom.find((card) => card.staffid === userId);
    }
    client.emit("bingo-card-receive", bingoCard);
  });

  client.on("check-token", function () {
    if (
      client.handshake.query &&
      client.handshake.query.token != "undefined" &&
      client.handshake.query.token
    ) {
      jwt.verify(client.handshake.query.token, secret, function (err, decoded) {
        if (err) return;

        username = decoded.name;
        userId = decoded.id;
        pass = decoded.pass;
        if (username == "" || pass == "") {
          client.emit("login-error");
        } else {
          //check login bằng data.json
          let result = userList.find((u) => {
            return u.id === userId && u.pass === pass;
          });
          if (result) {
            loginFlag = true;
            // const token = jwt.sign({ id: userId, name: username, pass: pass }, secret, { expiresIn: '100d' });
            formLogin = true;
            let isAdmin = false;
            if (
              userId.toLowerCase() == adminId.toLowerCase() ||
              userId.toLowerCase() == "BRYCENAD9999".toLowerCase()
            ) {
              adminToken = client.handshake.query.token;
              isAdmin = true;
            }
            client.emit(
              "login-success",
              userId,
              result.user,
              client.handshake.query.token,
              formLogin,
              isAdmin
            );
            client.emit("send-mess-list", messList, loginFlag);
            client.emit("send-mess-list-box", messList, loginFlag);
            // } else {
            //   //xác thực bằng ldap
            //   let clientLDAP = ldap.createClient({
            //     // url: "ldap://192.168.1.251:389", //ldap-old
            //     url: "ldap://192.168.249.3:389",
            //     reconnect: false
            //   });
            //   let dn = 'CN=' + username + ',CN=Users,DC=brycen-vn,DC=local';
            //   let formLogin;

            //   var options = {
            //     filter: '(cn=*)',
            //   };

            //   clientLDAP.bind(dn, pass, async function (err) {
            //     if (err) {
            //       client.emit("login-error");
            //       clientLDAP.destroy();
            //     } else {
            //       loginFlag = true;
            //       formLogin = true;
            //       client.emit("login-success", userId, username, client.handshake.query.token, formLogin);
            //       clientLDAP.destroy();
            //       client.emit("send-mess-list", messList, loginFlag);
            //       client.emit("send-mess-list-box", messList, loginFlag);
            //     }
            //   });
          }
        }

        if (loginFlag) {
          let bingoCard;
          if (!randomBingoCardFlg) {
            if (version == "ver75") {
              bingoCard = bingoCardListVer75.find(
                (card) => card.staffid === userId
              );
            } else {
              bingoCard = bingoCardListVer50.find(
                (card) => card.staffid === userId
              );
            }
          } else {
            bingoCard = lstBingoCardRandom.find(
              (card) => card.staffid === userId
            );
          }
          client.emit("bingo-card-receive", bingoCard);
        }
      });
    }
  });

  client.on("historyWin", function (token) {
    if (token == adminToken) {
      client.emit("lstWinner", lstWinner, endGameFlg);
    } else {
      client.emit("ERROR", "[historyWin]: không có quyền thực hiện chức năng");
    }
  });
  client.on("reloadData", function (token) {
    if (token == adminToken) {
      loadData();
    }
  });

  client.on("clearLstWinner", function (token) {
    if (token == adminToken) {
      lstWinner = [];
      client.emit("lstWinner", lstWinner, endGameFlg);
      client.broadcast.emit("lstWinner", lstWinner, endGameFlg);
    } else {
      client.emit("ERROR", "[historyWin]: không có quyền thực hiện chức năng");
    }
  });
});

function getNextNumber() {
  if (version == "ver100") {
    return Math.floor(Math.random() * 100);
  } else if (version == "ver75") {
    return Math.floor(Math.random() * 75) + 1;
  } else {
    return Math.floor(Math.random() * 50) + 1;
  }
}

function sendNextNumber() {
  if (version == "ver100") {
    if (bingoFlag || !runFlag || randomeList.length >= 100) {
      return;
    }
  } else if (version == "ver75") {
    if (bingoFlag || !runFlag || randomeList.length >= 75) {
      return;
    }
  } else {
    if (bingoFlag || !runFlag || randomeList.length >= 50) {
      return;
    }
  }
  //push new number
  var tmp = getNextNumber();
  while (randomeList.indexOf(tmp) !== -1) {
    tmp = getNextNumber();
  }
  randomeList.push(tmp);
  if (clientList.length == 0) {
    return;
  }
  clientList.forEach((client) => {
    let ip = client.conn.remoteAddress.replace("::ffff:", "");
    let data = { ip: ip, randomeList: randomeList };
    if (!bingoFlag) {
      client.emit("send-next-number", data, delaySecond, "update Number");
    }
  });
}

function formatDate(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
}

//----------------------Random Bingo Card---------------------
function clearData() {
  dataB = [];
  dataI = [];
  dataN = [];
  dataG = [];
  dataO = [];
  gen_nums = [];
  dataBingoCardRandom = {};
}

function checkDuplicate(array, el) {
  for (var i = 0; i < array.length; i++) if (array[i] == el) return true;
  return false;
}

function get_rand(array) {
  var rand = array[Math.floor(Math.random() * array.length)];
  if (!checkDuplicate(gen_nums, rand)) {
    gen_nums.push(rand);
    return rand;
  }
  return get_rand(array);
}

function randomNumber(version) {
  if (version == "ver100") {
    for (var i = 0; i < 5; i++) {
      dataB.push(get_rand(numsBV100));
      dataI.push(get_rand(numsIV100));
      dataN.push(get_rand(numsNV100));
      dataG.push(get_rand(numsGV100));
      dataO.push(get_rand(numsOV100));
    }
  } else if (version == "ver75") {
    for (var i = 0; i < 5; i++) {
      dataB.push(get_rand(numsBV75));
      dataI.push(get_rand(numsIV75));
      dataN.push(get_rand(numsNV75));
      dataG.push(get_rand(numsGV75));
      dataO.push(get_rand(numsOV75));
    }
  } else {
    for (var i = 0; i < 5; i++) {
      dataB.push(get_rand(numsB));
      dataI.push(get_rand(numsI));
      dataN.push(get_rand(numsN));
      dataG.push(get_rand(numsG));
      dataO.push(get_rand(numsO));
    }
  }
}

function randomBingoCard(version) {
  lstBingoCardRandom = [];
  for (var e = 0; e < lengthLstUser; e++) {
    idUser = Object.values(lstIdUser[e]);
    randomNumber(version);
    dataBingoCardRandom[0] = dataB;
    dataBingoCardRandom[1] = dataI;
    dataBingoCardRandom[2] = dataN;
    dataBingoCardRandom[3] = dataG;
    dataBingoCardRandom[4] = dataO;
    dataBingoCardRandom.staffid = idUser[0];
    lstBingoCardRandom.push(dataBingoCardRandom);
    clearData();
  }
  //cập nhật lstBingoCardRandom vào file json
  // fs.writeFile(
  //   './public/data/data-client-v50.json',
  //   JSON.stringify(lstBingoCardRandom),
  //   function (err) {
  //       if (err) {
  //           console.error('Crap happens');
  //       }
  //   }
  // );
}

function convertCharactToEmoji(message, src) {
  if (src == "" || src == undefined) {
    message = message.replace(/&lt;/g, "<");
    let result;
    let charact;
    switch (true) {
      case message.indexOf(":)") > -1:
        charact = ":)";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf("=)") > -1:
        charact = ":)";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          "=)",
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf(":D") > -1:
        charact = ":D";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf(":d") > -1:
        charact = ":D";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          ":d",
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf(":*") > -1:
        charact = ":*";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf(":(") > -1:
        charact = ":(";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf(":o") > -1:
        charact = ":o";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf("@@~") > -1:
        charact = "@@~";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf("<3") > -1:
        charact = "<3";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
      case message.indexOf("(y)") > -1:
        charact = "(y)";
        result = emojiAniList.find((u) => {
          return u.charact === charact;
        });
        message = message.replace(
          charact,
          '<img onclick="selectEmoji(event)" src="' + result.src + '">'
        );
        break;
    }
    return message;
  }
}
function checkInput(str) {
  if (str == undefined || str.toLocaleString().length < maxLength) {
    return true;
  } else {
    return false;
  }
}

function checkBingoNum(bingoList, token) {
  if (token == undefined) {
    //console.log("không tồn tại token");
    return false;
  }
  if (bingoList.length == 0) {
    //console.log("không tồn tại mảng");
    return false;
  }
  if (bingoList.length < 4 || bingoList.length > 5) {
    //console.log("Không phải 4 số");
    return false;
  }
  if (!Array.isArray(bingoList)) {
    //console.log("không phải là mảng");
    return false;
  }
  for (let num of bingoList.values()) {
    if (num == undefined || num.length > 2 || num > 100) {
      //console.log("Số không hợp lệ");
      return false;
    }
  }
  // tất cả 4 số trong numList phải nằm trong randomeList
  for (let num of bingoList.values()) {
    if (!randomeList.includes(num)) {
      //console.log("Số không nằm trong randomeList");
      return false;
    }
  }
  // Nếu có 2 số trùng nhau thì không hợp lệ
  if (new Set(bingoList).size !== bingoList.length) {
    //console.log("Có 2 số trùng nhau");
    return false;
  }

  // 20250512 Nếu user này đã tồn tại trong danh sách trúng thưởng thì loại ra.
  // if (new Set(bingoList).size !== bingoList.length) {
  //   //console.log("Đã tồn tại trong danh sách trúng thưởng"); return false;}

  // 4 số đó là 4 số của user này (bingoCard) và thuộc 1 trong 4 kiểu trúng bingo
  let checkResut = false;
  jwt.verify(token, secret, function (err, decoded) {
    if (err) return;
    username = decoded.name;
    userId = decoded.id;
    pass = decoded.pass;
    // bingoCard = version == 'ver75'
    //   ? bingoCardListVer75.find(e => e.staffid == [userId])
    //   : lstBingoCardRandom.find(e => e.staffid == [userId]);
    // if (!randomBingoCardFlg) {
    //   if (version == "ver75") {
    //     bingoCard = bingoCardListVer75.find(card => card.staffid === userId);
    //   } else {
    //     bingoCard = bingoCardListVer50.find(card => card.staffid === userId);
    //   }
    // } else {
    //   bingoCard = lstBingoCardRandom.find(card => card.staffid === userId);
    // }
    bingoCard = lstBingoCardRandom.find((card) => card.staffid === userId);
    //console.log("checkBingoNum", username, userId, pass, bingoCard);

    if (isBingoNgang(bingoList, bingoCard)) checkResut = true;
    if (isBingoDoc(bingoList, bingoCard)) checkResut = true;
    if (isBingoCheo1(bingoList, bingoCard)) checkResut = true;
    if (isBingoCheo2(bingoList, bingoCard)) checkResut = true;
  });
  if (!checkResut) return false;

  return true;
}
function isBingoCheo1(numList, bingoCard) {
  let check = true;
  if (!numList.includes(bingoCard[0][0])) check = false;
  if (!numList.includes(bingoCard[1][1])) check = false;
  if (!numList.includes(bingoCard[3][3])) check = false;
  if (!numList.includes(bingoCard[4][4])) check = false;
  return check;
}
function isBingoCheo2(numList, bingoCard) {
  let check = true;
  if (!numList.includes(bingoCard[0][4])) check = false;
  if (!numList.includes(bingoCard[1][3])) check = false;
  if (!numList.includes(bingoCard[3][1])) check = false;
  if (!numList.includes(bingoCard[4][0])) check = false;
  return check;
}

function isBingoDoc(numList, bingoCard) {
  let check = false;
  for (let row = 0; row < 5; row++) {
    let checkRow = true;
    for (let col = 0; col < 5; col++) {
      if (!(col == 2 && row == 2)) {
        // không phải cell chứa bingo
        if (!numList.includes(bingoCard[row][col])) checkRow = false;
      }
    }
    if (checkRow) {
      check = true;
      break;
    }
  }
  return check;
}
function isBingoNgang(numList, bingoCard) {
  let check = false;
  for (let col = 0; col < 5; col++) {
    let checkCol = true;
    for (let row = 0; row < 5; row++) {
      if (!(col == 2 && row == 2)) {
        // không phải cell chứa bingo
        if (!numList.includes(bingoCard[row][col])) checkCol = false;
      }
    }
    if (checkCol) {
      check = true;
      break;
    }
  }
  return check;
}
function getNumGroup(num) {
  let resType;
  switch (true) {
    case num >= 1 && num <= 15:
      resType = 1;
      break;
    case num >= 16 && num <= 30:
      resType = 2;
      break;
    case num >= 31 && num <= 45:
      resType = 3;
      break;
    case num >= 46 && num <= 60:
      resType = 4;
      break;
    case num >= 61 && num <= 75:
      resType = 5;
      break;
    default:
      break;
  }
  return resType;
}
function loadData() {
  fs.readFile("./public/data/data.json", "utf8", function (err, data) {
    if (err) throw err;
    userList = JSON.parse(data);
    sendUserList = userList.map((user) => {
      return {
        id: user.id,
        name: user.name,
        user: user.user,
      };
    });
    lstIdUser = userList.map((user) => {
      return {
        id: user.id,
      };
    });
    lengthLstUser = lstIdUser.length;
  });
}

// Chức năng bổ sung (Nhận giải + Chat riêng) - module độc lập, lỗi không ảnh hưởng game
try {
  require("./extra-features")({
    app,
    io,
    jwt,
    secret,
    maxLength,
    maxChatListLeng,
    userList: () => userList,
    gameCode: () => gameCode,
    lstWinner: () => lstWinner,
    // đăng 1 thông báo vào group chat tổng (cùng định dạng tin "Thông báo" của bingo)
    postNotice: (html, time) => {
      messList.push({ ip: "Thông báo", user: "Thông báo", data: html, time: time });
      if (messList.length == maxChatListLeng + 1) {
        messList.shift();
      }
      io.emit("send-mess-list", messList, loginFlag);
      io.emit("send-mess-list-box", messList, loginFlag);
    },
  });
} catch (e) {
  console.error("[extra-features] load error", e);
}

server.listen(7777);
//console.log("Started Server at 7777 ver 2025!");
