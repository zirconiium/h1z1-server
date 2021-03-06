"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var EventEmitter = require("events").EventEmitter, GatewayServer = require("./gatewayserver").GatewayServer, fs = require("fs"), path = require("path"), util = require("util"), Jenkins = require("hash-jenkins"), ZoneProtocol = require("./h1z1protocol").H1Z1Protocol, debug = require("debug")("ZoneServer"), MongoClient = require("mongodb").MongoClient, MongoServer = require("mongodb").Server;
function Int64String(value) {
    return "0x" + ("0000000000000000" + value.toString(16)).substr(-16);
}
function ZoneServer(serverPort, gatewayKey, UsingMongo) {
    EventEmitter.call(this);
    var gatewayServer = (this._gatewayServer = new GatewayServer("ExternalGatewayApi_3", serverPort, gatewayKey));
    var protocol = (this._protocol = new ZoneProtocol());
    var me = this;
    var clients = (this._clients = {});
    var characters = (this._characters = {});
    var ncps = {};
    this._usingMongo = UsingMongo;
    this._serverTime = 6662384021;
    this._transientId = 0;
    this._guids = {};
    gatewayServer.on("login", function (err, client, characterId) {
        debug("Client logged in from " +
            client.address +
            ":" +
            client.port +
            " with character id " +
            characterId);
        clients[client.sessionId] = client;
        client.transientIds = {};
        client.transientId = 0;
        client.character = {
            characterId: characterId,
            state: {
                position: [0, 0, 0, 0],
                rotation: [0, 0, 0, 0],
                health: 0,
                shield: 0,
            },
            client: client,
        };
        characters[characterId] = client.character;
        me.emit("login", err, client);
    });
    gatewayServer.on("disconnect", function (err, client) {
        debug("Client disconnected from " + client.address + ":" + client.port);
        delete clients[client.sessionId];
        me.emit("disconnect", err, client);
    });
    gatewayServer.on("session", function (err, client) {
        debug("Session started for client " + client.address + ":" + client.port);
    });
    var tunnelDataCount = 0;
    gatewayServer.on("tunneldata", function (err, client, data, flags) {
        var packet = protocol.parse(data, flags, true, me._referenceData);
        if (me._dumpData) {
            fs.writeFileSync(path.join(me._dumpDataPath, "tunneldata_" +
                tunnelDataCount++ +
                "_" +
                (packet ? packet.name : "Unknown") +
                ".dat"), data);
        }
        if (packet) {
            me.emit("data", null, client, packet);
        }
        else {
            fs.writeFileSync(path.join("../ps2debug/zonefailed/", "tunneldata_" +
                tunnelDataCount++ +
                "_" +
                (packet ? packet.name : "Unknown") +
                ".dat"), data);
        }
    });
}
util.inherits(ZoneServer, EventEmitter);
ZoneServer.prototype.start = function (callback) {
    return __awaiter(this, void 0, void 0, function () {
        var me, uri, mongoClient, waiting, e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    debug("Starting server");
                    this._startTime = Date.now();
                    me = this;
                    if (!this._usingMongo) return [3 /*break*/, 7];
                    uri = "mongodb://localhost:27017";
                    mongoClient = (this._mongoClient = new MongoClient(uri, {
                        useUnifiedTopology: true,
                        native_parser: true,
                    }));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, mongoClient.connect()];
                case 2:
                    waiting = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    throw console.error("[ERROR]Unable to connect to mongo server");
                case 4:
                    if (!mongoClient.isConnected()) return [3 /*break*/, 6];
                    log("connected to mongo !");
                    _a = this;
                    return [4 /*yield*/, mongoClient.db("h1server")];
                case 5:
                    _a._db = _b.sent();
                    return [3 /*break*/, 7];
                case 6: throw log("Unable to authenticate on mongo !", 2);
                case 7:
                    this._gatewayServer.start();
                    return [2 /*return*/];
            }
        });
    });
};
ZoneServer.prototype.data = function (collectionName) {
    if (this._db) {
        return this._db.collection(collectionName);
    }
};
ZoneServer.prototype.setReferenceData = function (referenceData) {
    this._referenceData = referenceData;
};
ZoneServer.prototype.sendSystemMessage = function (client, message) {
    this.sendDataToAll("Chat.Chat", {
        unknown2: 0,
        channel: 2,
        characterId1: "0x0000000000000000",
        characterId2: "0x0000000000000000",
        unknown5_0: 0,
        unknown5_1: 0,
        unknown5_2: 0,
        characterName1: "",
        unknown5_3: "",
        unknown6_0: 0,
        unknown6_1: 0,
        unknown6_2: 0,
        characterName2: "",
        unknown6_3: "",
        message: message,
        position: [0, 0, 0, 1],
        unknownGuid: "0x0000000000000000",
        unknown13: 0,
        color1: 0,
        color2: 0,
        unknown15: 0,
        unknown16: false,
    });
};
ZoneServer.prototype.sendChatText = function (client, message) {
    this.sendData(client, "Chat.ChatText", {
        message: message,
        unknownDword1: 0,
        color: [255, 255, 255, 0],
        unknownDword2: 13951728,
        unknownByte3: 0,
        unknownByte4: 1,
    });
};
ZoneServer.prototype.setCharacterLoadout = function (client, loadoutId, loadoutTab) {
    for (var i = 0; i < client.character.loadouts.length; i++) {
        var loadout = client.character.loadouts[i];
        if (loadout.loadoutId == loadoutId && loadout.unknownDword2 == loadoutTab) {
            this.sendChatText(client, "Setting loadout " + loadoutId);
            debug(JSON.stringify(loadout, null, 2));
            client.character.currentLoadout = loadout.loadoutData;
            client.character.currentLoadoutId = loadoutId;
            client.character.currentLoadoutTab = loadoutTab;
            this.sendData(client, "Loadout.SetCurrentLoadout", {
                type: 2,
                unknown1: 0,
                loadoutId: loadoutId,
                tabId: loadoutTab,
                unknown2: 1,
            });
            break;
        }
    }
};
ZoneServer.prototype.setCharacterLoadout = function (client, loadoutId, loadoutTab) {
    for (var i = 0; i < client.character.loadouts.length; i++) {
        var loadout = client.character.loadouts[i];
        if (loadout.loadoutId == loadoutId && loadout.unknownDword2 == loadoutTab) {
            this.sendChatText(client, "Setting loadout " + loadoutId);
            debug(JSON.stringify(loadout, null, 2));
            client.character.currentLoadout = loadout.loadoutData;
            client.character.currentLoadoutId = loadoutId;
            client.character.currentLoadoutTab = loadoutTab;
            this.sendData(client, "Loadout.SetCurrentLoadout", {
                type: 2,
                unknown1: 0,
                loadoutId: loadoutId,
                tabId: loadoutTab,
                unknown2: 1,
            });
            break;
        }
    }
};
var outcount = 0;
ZoneServer.prototype.sendData = function (client, packetName, obj) {
    var data = this._protocol.pack(packetName, obj, this._referenceData);
    fs.writeFileSync(path.join("../ps2debug/zonefailed/", "outdata_" + outcount++ + "_" + packetName + ".dat"), data);
    if (Array.isArray(client)) {
        for (var i = 0; i < client.length; i++) {
            this._gatewayServer.sendTunnelData(client[i], data);
        }
    }
    else {
        this._gatewayServer.sendTunnelData(client, data);
    }
};
ZoneServer.prototype.sendDataToAll = function (packetName, obj) {
    var clients = [];
    for (var a in this._clients) {
        clients.push(this._clients[a]);
    }
    this.sendData(clients, packetName, obj);
};
ZoneServer.prototype.sendWeaponPacket = function (client, packetName, obj) {
    var weaponPacket = {
        gameTime: this.getServerTime(),
        packetName: packetName,
        packet: obj,
    };
    this.sendData(client, "Weapon.Weapon", {
        weaponPacket: weaponPacket,
    });
};
ZoneServer.prototype.toggleDataDump = function (value, path) {
    this._dumpData = !!value;
    this._dumpDataPath = path || "./debug";
};
ZoneServer.prototype.sendRawData = function (client, data) {
    this._gatewayServer.sendTunnelData(client, data);
};
ZoneServer.prototype.stop = function () {
    debug("Shutting down");
};
ZoneServer.prototype.getGameTime = function () {
    return Math.floor(Date.now() / 1000);
};
ZoneServer.prototype.getServerTime = function () {
    var delta = Date.now() - this._startTime;
    delta = Math.floor(delta / 1000);
    return this._serverTime + delta;
};
ZoneServer.prototype.sendGameTimeSync = function (client) {
    this.sendData(client, "GameTimeSync", {
        time: Int64String(this.getGameTime()),
        unknownFloat1: 12,
        unknownBoolean1: false,
    });
};
ZoneServer.prototype.generateGuid = function () {
    var str = "0x";
    for (var i = 0; i < 16; i++) {
        str += Math.floor(Math.random() * 16).toString(16);
    }
    if (!this._guids[str]) {
        this._guids[str] = true;
        return str;
    }
    else {
        return this.generateGuid();
    }
};
ZoneServer.prototype.getTransientId = function (client, guid) {
    if (!client.transientIds[guid]) {
        client.transientId++;
        client.transientIds[guid] = client.transientId;
    }
    return client.transientIds[guid];
};
ZoneServer.prototype.spawnNPC = function (npcId, position, rotation, callback) {
    var server = this;
    this.data("npcs").findOne({ id: npcId }, function (err, npc) {
        if (err) {
            debug(err);
            return;
        }
        if (npc) {
            var guid = server.generateGuid();
            server.npcs[guid] = {
                guid: guid,
                position: position,
                rotation: rotation,
                npcDefinition: npc,
            };
            var npcData = {
                guid: guid,
                transientId: transientId,
                unknownString0: "",
                nameId: npc.name_id > 0 ? npc.name_id : 0,
                unknownDword2: 242919,
                unknownDword3: 310060,
                unknownByte1: 1,
                modelId: npc.model_id || 0,
                scale: [1, 1, 1, 1],
                unknownString1: "",
                unknownString2: "",
                unknownDword5: 0,
                unknownDword6: 0,
                position: position,
                unknownVector1: [0, -0.7071066498756409, 0, 0.70710688829422],
                rotation: [-1.570796012878418, 0, 0, 0],
                unknownDword7: 0,
                unknownFloat1: 0,
                unknownString3: "",
                unknownString4: "",
                unknownString5: "",
                vehicleId: 0,
                unknownDword9: 0,
                npcDefinitionId: npc.id || 0,
                unknownByte2: 0,
                profileId: npc.profile_id || 0,
                unknownBoolean1: true,
                unknownData1: {
                    unknownByte1: 16,
                    unknownByte2: 10,
                    unknownByte3: 0,
                },
                unknownByte6: 0,
                unknownDword11: 0,
                unknownGuid1: "0x0000000000000000",
                unknownData2: {
                    unknownGuid1: "0x0000000000000000",
                },
                unknownDword12: 0,
                unknownDword13: 0,
                unknownDword14: 0,
                unknownByte7: 0,
                unknownArray1: [],
            };
            callback(null, servers.npcs[guid]);
        }
        else {
            callback("NPC " + npcId + " not found");
        }
    });
};
ZoneServer.prototype.spawnVehicle = function (vehicleId) { };
ZoneServer.prototype.createPositionUpdate = function (position, rotation) {
    var obj = {
        flags: 4095,
        unknown2_int32: this.getGameTime(),
        unknown3_int8: 0,
        unknown4: 1,
        position: position,
        unknown6_int32: 3217625048,
        unknown7_float: 0,
        unknown8_float: 0,
        unknown9_float: 0,
        unknown10_float: 0,
        unknown11_float: 0,
        unknown12_float: [0, 0, 0],
        unknown13_float: rotation,
        unknown14_float: 0,
        unknown15_float: 0,
    };
    return obj;
};
exports.ZoneServer = ZoneServer;
