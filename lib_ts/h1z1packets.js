var PacketTable = require("./packettable"),
  DataSchema = require("h1z1-dataschema");

function readPacketType(data, packets) {
  var opCode = data[0] >>> 0,
    length = 0,
    packet;
  if (packets[opCode]) {
    packet = packets[opCode];
    length = 1;
  } else if (data.length > 1) {
    opCode = ((data[0] << 8) + data[1]) >>> 0;
    if (packets[opCode]) {
      packet = packets[opCode];
      length = 2;
    } else if (data.length > 2) {
      opCode = ((data[0] << 16) + (data[1] << 8) + data[2]) >>> 0;
      if (packets[opCode]) {
        packet = packets[opCode];
        length = 3;
      } else if (data.length > 3) {
        opCode =
          ((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) >>> 0;
        if (packets[opCode]) {
          packet = packets[opCode];
          length = 4;
        }
      }
    }
  }
  return {
    packetType: opCode,
    packet: packet,
    length: length,
  };
}

function writePacketType(packetType) {
  var packetTypeBytes = [];
  while (packetType) {
    packetTypeBytes.unshift(packetType & 0xff);
    packetType = packetType >> 8;
  }
  var data = new Buffer.alloc(packetTypeBytes.length);
  for (var i = 0; i < packetTypeBytes.length; i++) {
    data.writeUInt8(packetTypeBytes[i], i);
  }
  return data;
}

function readUnsignedIntWith2bitLengthValue(data, offset) {
  var value = data.readUInt8(offset);
  var n = value & 3;
  for (var i = 0; i < n; i++) {
    value += data.readUInt8(offset + i + 1) << ((i + 1) * 8);
  }
  value = value >>> 2;
  return {
    value: value,
    length: n + 1,
  };
}

function packUnsignedIntWith2bitLengthValue(value) {
  value = Math.round(value);
  value = value << 2;
  var n = 0;
  if (value > 0xffffff) {
    n = 3;
  } else if (value > 0xffff) {
    n = 2;
  } else if (value > 0xff) {
    n = 1;
  }
  value |= n;
  var data = new Buffer.alloc(4);
  data.writeUInt32LE(value, 0);
  return data.slice(0, n + 1);
}

function readSignedIntWith2bitLengthValue(data, offset) {
  var value = data.readUInt8(offset);
  var sign = value & 1;
  var n = (value >> 1) & 3;
  for (var i = 0; i < n; i++) {
    value += data.readUInt8(offset + i + 1) << ((i + 1) * 8);
  }
  value = value >>> 3;
  if (sign) {
    value = -value;
  }
  return {
    value: value,
    length: n + 1,
  };
}

function packSignedIntWith2bitLengthValue(value) {
  value = Math.round(value);
  var sign = value < 0 ? 1 : 0;
  value = sign ? -value : value;
  value = value << 3;
  var n = 0;
  if (value > 0xffffff) {
    n = 3;
  } else if (value > 0xffff) {
    n = 2;
  } else if (value > 0xff) {
    n = 1;
  }
  value |= n << 1;
  value |= sign;
  var data = new Buffer.alloc(4);
  data.writeUInt32LE(value, 0);
  return data.slice(0, n + 1);
}

function readPositionUpdateData(data, offset) {
  var obj = {},
    startOffset = offset;

  obj["flags"] = data.readUInt16LE(offset);
  offset += 2;

  obj["unknown2_int32"] = data.readUInt32LE(offset);
  offset += 4;

  obj["unknown3_int8"] = data.readUInt8(offset);
  offset += 1;

  if (obj.flags & 1) {
    var v = readUnsignedIntWith2bitLengthValue(data, offset);
    obj["unknown4"] = v.value;
    offset += v.length;
  }

  if (obj.flags & 2) {
    obj["position"] = [];
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["position"][0] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["position"][1] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["position"][2] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x20) {
    obj["unknown6_int32"] = data.readUInt32LE(offset);
    offset += 4;
  }

  if (obj.flags & 0x40) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown7_float"] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x80) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown8_float"] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 4) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown9_float"] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x8) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown10_float"] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x10) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown11_float"] = v.value / 10;
    offset += v.length;
  }

  if (obj.flags & 0x100) {
    obj["unknown12_float"] = [];
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown12_float"][0] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown12_float"][1] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown12_float"][2] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x200) {
    obj["unknown13_float"] = [];
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown13_float"][0] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown13_float"][1] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown13_float"][2] = v.value / 100;
    offset += v.length;
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown13_float"][3] = v.value / 100;
    offset += v.length;
  }

  if (obj.flags & 0x400) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown14_float"] = v.value / 10;
    offset += v.length;
  }

  if (obj.flags & 0x800) {
    var v = readSignedIntWith2bitLengthValue(data, offset);
    obj["unknown15_float"] = v.value / 10;
    offset += v.length;
  }
  if (obj.flags & 0xe0) {
  }

  return {
    value: obj,
    length: offset - startOffset,
  };
}

function packPositionUpdateData(obj) {
  var data = new Buffer.alloc(7),
    flags = 0,
    v;

  data.writeUInt32LE(obj["unknown2_int32"], 2);
  data.writeUInt8(obj["unknown3_int8"], 6);

  if ("unknown4" in obj) {
    flags |= 1;
    v = packUnsignedIntWith2bitLengthValue(obj["unknown4"]);
    data = Buffer.concat([data, v]);
  }

  if ("position" in obj) {
    flags |= 2;
    v = packSignedIntWith2bitLengthValue(obj["position"][0] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["position"][1] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["position"][2] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown6_int32" in obj) {
    flags |= 0x20;
    v = new Buffer.alloc(4);
    v.writeUInt32LE(obj["unknown6_int32"], 0);
    data = Buffer.concat([data, v]);
  }

  if ("unknown7_float" in obj) {
    flags |= 0x40;
    v = packSignedIntWith2bitLengthValue(obj["unknown7_float"] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown8_float" in obj) {
    flags |= 0x80;
    v = packSignedIntWith2bitLengthValue(obj["unknown8_float"] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown9_float" in obj) {
    flags |= 4;
    v = packSignedIntWith2bitLengthValue(obj["unknown9_float"] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown10_float" in obj) {
    flags |= 8;
    v = packSignedIntWith2bitLengthValue(obj["unknown10_float"] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown11_float" in obj) {
    flags |= 0x10;
    v = packSignedIntWith2bitLengthValue(obj["unknown11_float"] * 10);
    data = Buffer.concat([data, v]);
  }

  if ("unknown12_float" in obj) {
    flags |= 0x100;
    v = packSignedIntWith2bitLengthValue(obj["unknown12_float"][0] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["unknown12_float"][1] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["unknown12_float"][2] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown13_float" in obj) {
    flags |= 0x200;
    v = packSignedIntWith2bitLengthValue(obj["unknown13_float"][0] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["unknown13_float"][1] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["unknown13_float"][2] * 100);
    data = Buffer.concat([data, v]);
    v = packSignedIntWith2bitLengthValue(obj["unknown13_float"][3] * 100);
    data = Buffer.concat([data, v]);
  }

  if ("unknown14_float" in obj) {
    flags |= 0x400;
    v = packSignedIntWith2bitLengthValue(obj["unknown14_float"] * 10);
    data = Buffer.concat([data, v]);
  }

  if ("unknown15_float" in obj) {
    flags |= 0x800;
    v = packSignedIntWith2bitLengthValue(obj["unknown15_float"] * 10);
    data = Buffer.concat([data, v]);
  }

  data.writeUInt16LE(flags, 0);

  return data;
}

function lz4_decompress(data, inSize, outSize) {
  var outdata = new Buffer.alloc(outSize),
    token,
    literalLength,
    matchLength,
    matchOffset,
    matchStart,
    matchEnd,
    offsetIn = 0,
    offsetOut = 0;

  while (1) {
    var token = data[offsetIn];
    var literalLength = token >> 4;
    var matchLength = token & 0xf;
    offsetIn++;
    if (literalLength) {
      if (literalLength == 0xf) {
        while (data[offsetIn] == 0xff) {
          literalLength += 0xff;
          offsetIn++;
        }
        literalLength += data[offsetIn];
        offsetIn++;
      }
      data.copy(outdata, offsetOut, offsetIn, offsetIn + literalLength);

      offsetIn += literalLength;
      offsetOut += literalLength;
    }

    if (offsetIn < data.length - 2) {
      var matchOffset = data.readUInt16LE(offsetIn);
      offsetIn += 2;

      if (matchLength == 0xf) {
        while (data[offsetIn] == 0xff) {
          matchLength += 0xff;
          offsetIn++;
        }
        matchLength += data[offsetIn];
        offsetIn++;
      }
      matchLength += 4;
      var matchStart = offsetOut - matchOffset,
        matchEnd = offsetOut - matchOffset + matchLength;
      for (var i = matchStart; i < matchEnd; i++) {
        outdata[offsetOut] = outdata[i];
        offsetOut++;
      }
    } else {
      break;
    }
  }
  return outdata;
}

var vehicleReferenceDataSchema = [
  {
    name: "move_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "unknownByte1", type: "uint8" },
          { name: "unknownByte2", type: "uint8" },
          { name: "unknownDword2", type: "uint32" },
          { name: "unknownByte3", type: "uint8" },

          { name: "unknownFloat1", type: "float" },
          { name: "unknownFloat2", type: "float" },
          { name: "max_forward", type: "float" },
          { name: "max_reverse", type: "float" },
          { name: "max_dive", type: "float" },
          { name: "max_rise", type: "float" },
          { name: "max_strafe", type: "float" },
          { name: "accel_forward", type: "float" },
          { name: "accel_reverse", type: "float" },
          { name: "accel_dive", type: "float" },
          { name: "accel_rise", type: "float" },
          { name: "accel_strafe", type: "float" },
          { name: "brake_forward", type: "float" },
          { name: "brake_reverse", type: "float" },
          { name: "brake_dive", type: "float" },
          { name: "brake_rise", type: "float" },
          { name: "brake_strafe", type: "float" },
          { name: "move_pitch_rate", type: "float" },
          { name: "move_yaw_rate", type: "float" },
          { name: "move_roll_rate", type: "float" },
          { name: "still_pitch_rate", type: "float" },
          { name: "still_yaw_rate", type: "float" },
          { name: "still_roll_rate", type: "float" },
          { name: "unknownDword3", type: "uint32" },
          { name: "unknownDword4", type: "uint32" },
          { name: "landing_gear_height", type: "uint32" },
          { name: "vehicle_archetype", type: "uint8" },
          { name: "movement_mode", type: "uint8" },
          { name: "change_mode_speed_percent", type: "float" },
          { name: "unknownFloat25", type: "float" },
          { name: "unknownFloat26", type: "float" },
          { name: "min_traction", type: "float" },
          { name: "linear_redirect", type: "float" },
          { name: "linear_dampening", type: "float" },
          { name: "hover_power", type: "float" },
          { name: "hover_length", type: "float" },
          { name: "unknownFloat32", type: "float" },
          { name: "unknownFloat33", type: "float" },
          { name: "unknownFloat34", type: "float" },
          { name: "unknownFloat35", type: "float" },
          { name: "unknownFloat36", type: "float" },
          { name: "dead_zone_size", type: "float" },
          { name: "dead_zone_rate", type: "float" },
          { name: "dead_zone_sensitivity", type: "float" },
          { name: "unknownFloat40", type: "float" },
          { name: "unknownFloat41", type: "float" },
          { name: "auto_level_roll_rate", type: "float" },
          { name: "camera_shake_intensity", type: "float" },
          { name: "camera_shake_speed", type: "float" },
          { name: "camera_shake_change_speed", type: "float" },
          { name: "unknownFloat46", type: "float" },
          { name: "inward_yaw_mod", type: "float" },
          { name: "unknownFloat48", type: "float" },
          { name: "vehicle_strafe_lift", type: "float" },
          { name: "dead_zone_influence_exponent", type: "float" },
          { name: "camera_shake_initial_intensity", type: "float" },
          { name: "unknownFloat52", type: "float" },
          { name: "dampening", type: "floatvector3" },
          { name: "unknownFloat53", type: "float" },
          { name: "unknownFloat54", type: "float" },
          { name: "sprint_lift_sub", type: "float" },
          { name: "sprint_lift_factor", type: "float" },
          { name: "lift_factor", type: "float" },
          { name: "unknownFloat58", type: "float" },
          { name: "steer_burst_factor", type: "floatvector3" },
          { name: "steer_burst_speed", type: "float" },
          { name: "steer_factor", type: "float" },
          { name: "steer_exponent", type: "float" },
          { name: "steer_spin_factor", type: "float" },
          { name: "steer_spin_exponent", type: "float" },
          { name: "steer_lean_factor", type: "float" },
          { name: "steer_lean_turn_factor", type: "float" },
          { name: "steer_compensate_factor", type: "float" },
          { name: "unknownFloat67", type: "float" },
          { name: "unknownFloat68", type: "float" },
          { name: "angular_dampening_scalar", type: "float" },
          { name: "angular_dampening", type: "floatvector3" },
          { name: "estimated_max_speed", type: "uint32" },
          { name: "hill_climb", type: "float" },
          { name: "hill_climb_decay_range", type: "float" },
          { name: "hill_climb_min_power", type: "float" },
          { name: "unknownFloat73", type: "float" },
          { name: "unknownDword7", type: "uint32" },
          { name: "unknownDword8", type: "uint32" },
          { name: "unknownDword9", type: "uint32" },
          { name: "unknownDword10", type: "uint32" },
          { name: "unknownDword11", type: "uint32" },
          { name: "unknownDword12", type: "uint32" },
          { name: "unknownDword13", type: "uint32" },
          { name: "unknownDword14", type: "uint32" },
          { name: "unknownDword15", type: "uint32" },
          { name: "unknownDword16", type: "uint32" },
          { name: "unknownDword17", type: "uint32" },
          { name: "wake_effect", type: "uint32" },
          { name: "debris_effect", type: "uint32" },
        ],
      },
    ],
  },
  {
    name: "dynamics_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "max_velocity", type: "float" },
          { name: "turn_torque", type: "float" },
          { name: "turn_rate", type: "float" },
          { name: "center_of_gravity_y", type: "float" },
        ],
      },
    ],
  },
  {
    name: "engine_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "peak_torque", type: "float" },
          { name: "torque_curve_y", type: "float" },
          { name: "engaged_clutch_damp", type: "float" },
          { name: "disengaged_clutch_damp", type: "float" },
          { name: "clutch_strength", type: "float" },
          { name: "reverse_gear", type: "float" },
          { name: "first_gear", type: "float" },
          { name: "second_gear", type: "float" },
          { name: "third_gear", type: "float" },
          { name: "fourth_gear", type: "float" },
          { name: "switch_gear_time", type: "float" },
        ],
      },
    ],
  },
  {
    name: "suspension_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "spring_frequency", type: "float" },
          { name: "spring_damper_ratio", type: "float" },
          {
            name: "hashes",
            type: "array",
            fields: [
              { name: "hash_1", type: "uint32" },
              { name: "hash_2", type: "uint32" },
            ],
          },
        ],
      },
    ],
  },

  {
    name: "vehicle_model_mappings",
    type: "array",
    fields: [
      { name: "vehicle_id", type: "uint32" },
      { name: "model_id", type: "uint32" },
    ],
  },

  {
    name: "wheel_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "max_brake", type: "float" },
          { name: "max_hand_brake", type: "float" },
          { name: "max_steer", type: "float" },
          {
            name: "hashes",
            type: "array",
            fields: [
              { name: "hash_1", type: "uint32" },
              { name: "hash_2", type: "uint32" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "tire_info",
    type: "array",
    fields: [
      { name: "id", type: "uint32" },
      {
        name: "data",
        type: "schema",
        fields: [
          { name: "id", type: "uint32" },
          { name: "long_stiff", type: "float" },
          { name: "tire_second", type: "float" },
          {
            name: "hashes",
            type: "array",
            fields: [
              { name: "hash_1", type: "uint32" },
              { name: "hash_2", type: "uint32" },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "vehicle_move_info_mappings",
    type: "array",
    fields: [
      { name: "vehicle_id", type: "uint32" },
      { name: "move_info", type: "array", elementType: "uint32" },
    ],
  },
];

function parseVehicleReferenceData(data, offset) {
  var dataLength = data.readUInt32LE(offset);
  offset += 4;
  data = data.slice(offset, offset + dataLength);

  var inSize = data.readUInt32LE(0),
    outSize = data.readUInt32LE(4),
    compData = data.slice(8);
  data = lz4_decompress(compData, inSize, outSize);

  var result = DataSchema.parse(vehicleReferenceDataSchema, data, 0).result;

  return {
    value: result,
    length: dataLength + 4,
  };
}

function packVehicleReferenceData(obj) {
  var data = DataSchema.pack(vehicleReferenceDataSchema, obj);
  return data;
}

function parseItemAddData(data, offset, referenceData) {
  var itemDataLength = data.readUInt32LE(offset);
  offset += 4;

  var itemData = data.slice(offset, offset + itemDataLength);

  var inSize = itemData.readUInt16LE(0),
    outSize = itemData.readUInt16LE(2),
    compData = itemData.slice(4, 4 + inSize),
    decompData = lz4_decompress(compData, inSize, outSize),
    itemDefinition = DataSchema.parse(baseItemDefinitionSchema, decompData, 0)
      .result;

  var itemData = parseItemData(itemData, 4 + inSize, referenceData).value;
  return {
    value: {
      itemDefinition: itemDefinition,
      itemData: itemData,
    },
    length: itemDataLength + 4,
  };
}

function packItemAddData(obj) {}

function parseItemDefinitions(data, offset) {
  var itemDataLength = data.readUInt32LE(offset);
  offset += 4;
  var itemData = data.slice(offset, offset + itemDataLength);

  var itemDefinitions = [],
    item,
    n = itemData.readUInt32LE(0),
    itemDataOffset = 4;

  for (var i = 0; i < n; i++) {
    var blockSize = itemData.readUInt16LE(itemDataOffset),
      blockSizeOut = itemData.readUInt16LE(itemDataOffset + 2),
      blockData = itemData.slice(
        itemDataOffset + 4,
        itemDataOffset + 4 + blockSize
      ),
      itemDefinitionData = lz4_decompress(blockData, blockSize, blockSizeOut);
    itemDataOffset += 4 + blockSize;
    itemDefinitions.push(
      DataSchema.parse(baseItemDefinitionSchema, itemDefinitionData, 0).result
    );
  }

  // var str = "";
  // for (var a in itemDefinitions[0]) {
  //     if (a == "flags1" || a == "flags2") {
  //         for (var j in itemDefinitions[0][a]) {
  //             str += a + "_" + j + "\t";
  //         }
  //     } else {
  //         str += a + "\t";
  //     }
  // }
  // str += "\n";
  // for (var i=0;i<itemDefinitions.length;i++) {
  //     for (var a in itemDefinitions[i]) {
  //         if (a == "flags1" || a == "flags2") {
  //             for (var j in itemDefinitions[i][a]) {
  //                 str += +itemDefinitions[i][a][j] + "\t";
  //             }
  //         } else {
  //             str += itemDefinitions[i][a] + "\t";
  //         }
  //     }
  //     str += "\n";
  // }
  // require("fs").writeFileSync("debug/itemDefinitions.txt", str);
  return {
    value: itemDefinitions,
    length: itemDataLength + 4,
  };
}

function packItemDefinitions(obj) {}

var profileDataSchema = [
  { name: "profileId", type: "uint32" },
  { name: "nameId", type: "uint32" },
  { name: "descriptionId", type: "uint32" },
  { name: "type", type: "uint32" },
  { name: "iconId", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  { name: "unknownBoolean1", type: "boolean" },
  { name: "unknownDword9", type: "uint32" },
  {
    name: "unknownArray1",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownDword3", type: "uint32" },
    ],
  },
  { name: "unknownBoolean2", type: "boolean" },
  { name: "unknownDword10", type: "uint32" },
  { name: "unknownDword11", type: "uint32" },
  { name: "unknownBoolean3", type: "boolean" },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownBoolean4", type: "boolean" },
  { name: "unknownBoolean5", type: "boolean" },
  { name: "unknownFloat1", type: "float" },
  { name: "unknownFloat2", type: "float" },
  { name: "unknownFloat3", type: "float" },
  { name: "unknownFloat4", type: "float" },
  { name: "unknownDword13", type: "uint32" },
  { name: "unknownFloat5", type: "float" },
  { name: "unknownDword14", type: "uint32" },
  { name: "unknownDword15", type: "uint32" },
  { name: "unknownDword16", type: "uint32" },
  { name: "unknownDword17", type: "uint32" },
  { name: "unknownDword18", type: "uint32" },
  { name: "unknownDword19", type: "uint32" },
];

var baseItemDefinitionSchema = [
  { name: "itemId", type: "uint32" },
  {
    name: "flags1",
    type: "bitflags",
    flags: [
      { bit: 0, name: "bit0" },
      { bit: 1, name: "forceDisablePreview" },
      { bit: 2, name: "bit2" },
      { bit: 3, name: "bit3" },
      { bit: 4, name: "bit4" },
      { bit: 5, name: "bit5" },
      { bit: 6, name: "bit6" },
      { bit: 7, name: "noTrade" },
    ],
  },
  {
    name: "flags2",
    type: "bitflags",
    flags: [
      { bit: 0, name: "bit0" },
      { bit: 1, name: "bit1" },
      { bit: 2, name: "bit2" },
      { bit: 3, name: "accountScope" },
      { bit: 4, name: "canEquip" },
      { bit: 5, name: "removeOnUse" },
      { bit: 6, name: "consumeOnUse" },
      { bit: 7, name: "quickUse" },
    ],
  },
  { name: "flags3", type: "uint8" },
  { name: "nameId", type: "uint32" },
  { name: "descriptionId", type: "uint32" },
  { name: "contentId", type: "uint32" },
  { name: "imageSetId", type: "uint32" },
  { name: "unknown4", type: "uint32" },
  { name: "hudImageSetId", type: "uint32" },
  { name: "unknown6", type: "uint32" },
  { name: "unknown7", type: "uint32" },
  { name: "cost", type: "uint32" },
  { name: "itemClass", type: "uint32" },
  { name: "profileOverride", type: "uint32" },
  { name: "slot", type: "uint32" },
  { name: "unknownDword1", type: "uint32" },
  { name: "modelName", type: "string" },
  { name: "textureAlias", type: "string" },
  { name: "unknown13", type: "uint8" },
  { name: "unknown14", type: "uint32" },
  { name: "categoryId", type: "uint32" },
  { name: "unknown16", type: "uint32" },
  { name: "unknown17", type: "uint32" },
  { name: "unknown18", type: "uint32" },
  { name: "minProfileRank", type: "uint32" },
  { name: "unknown19", type: "uint32" },
  { name: "activatableAbililtyId", type: "uint32" },
  { name: "passiveAbilityId", type: "uint32" },
  { name: "passiveAbilitySetId", type: "uint32" },
  { name: "maxStackable", type: "uint32" },
  { name: "tintAlias", type: "string" },
  { name: "unknown23", type: "uint32" },
  { name: "unknown24", type: "uint32" },
  { name: "unknown25", type: "uint32" },
  { name: "unknown26", type: "uint32" },
  { name: "uiModelCameraId", type: "uint32" },
  { name: "equipCountMax", type: "uint32" },
  { name: "currencyType", type: "uint32" },
  { name: "dataSheetId", type: "uint32" },
  { name: "itemType", type: "uint32" },
  { name: "skillSetId", type: "uint32" },
  { name: "overlayTexture", type: "string" },
  { name: "decalSlot", type: "string" },
  { name: "overlayAdjustment", type: "uint32" },
  { name: "trialDurationSec", type: "uint32" },
  { name: "nextTrialDelaySec", type: "uint32" },
  { name: "clientUseRequirementId", type: "uint32" },
  { name: "overrideAppearance", type: "string" },
  { name: "unknown35", type: "uint32" },
  { name: "unknown36", type: "uint32" },
  { name: "param1", type: "uint32" },
  { name: "param2", type: "uint32" },
  { name: "param3", type: "uint32" },
  { name: "uiModelCameraId2", type: "uint32" },
  { name: "unknown41", type: "uint32" },
];

var lightWeightNpcSchema = [
  { name: "guid", type: "uint64" },
  {
    name: "transientId",
    type: "custom",
    parser: readUnsignedIntWith2bitLengthValue,
    packer: packUnsignedIntWith2bitLengthValue,
  },
  { name: "unknownString0", type: "string", defaultValue: "" },
  { name: "nameId", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownByte1", type: "uint8" },
  { name: "modelId", type: "uint32" },
  { name: "scale", type: "floatvector4" },
  { name: "unknownString1", type: "string" },
  { name: "unknownString2", type: "string" },
  { name: "unknownDword5", type: "uint32" },
  // { name: "unknownString3",   type: "string" },
  { name: "position", type: "floatvector3" },
  { name: "unknownVector1", type: "floatvector4" },
  { name: "rotation", type: "floatvector4" },
  // { name: "unknownDword7",    type: "uint32" },
  // { name: "unknownFloat1",    type: "float" },
  // { name: "unknownString4",   type: "string" },
  // { name: "unknownString5",   type: "string" },
  // { name: "unknownString6",   type: "string" },
  // { name: "vehicleId",        type: "uint32" },
  // { name: "unknownDword9",    type: "uint32" },
  // { name: "npcDefinitionId",  type: "uint32" },
  // { name: "unknownByte2",     type: "uint8" },
  // { name: "profileId",        type: "uint32" },
  // { name: "unknownBoolean1",  type: "boolean" },
  // { name: "unknownData1",     type: "schema", fields: [
  //     { name: "unknownByte1",     type: "uint8" },
  //     { name: "unknownByte2",     type: "uint8" },
  //     { name: "unknownByte3",     type: "uint8" }
  // ]},
  // { name: "unknownByte6",     type: "uint8" },
  // { name: "unknownDword11",   type: "uint32" },
  // { name: "unknownGuid1",     type: "uint64" },
  // { name: "unknownData2",     type: "schema", fields: [
  //     { name: "unknownGuid1",     type: "uint64" }
  // ]},

  // { name: "unknownDword12",   type: "uint32" },
  // { name: "unknownDword13",   type: "uint32" },
  // { name: "unknownDword14",   type: "uint32" },
  // { name: "unknownByte7",     type: "uint8" },
  // { name: "unknownArray1",    type: "array", fields: [
  //     { name: "unknownByte1",     type: "uint8" },
  //     { name: "unknownDword1",    type: "uint32" },
  //     { name: "unknownDword2",    type: "uint32" },
  //     { name: "unknownDword3",    type: "uint32" },
  //     { name: "characterId",      type: "uint64" },
  //     { name: "unknownDword4",    type: "uint32" },
  //     { name: "unknownDword5",    type: "uint32" }
  // ]}
];

var profileStatsSubSchema1 = [
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownArray1", type: "array", elementType: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
];

var weaponStatsDataSubSchema1 = [
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  { name: "unknownDword9", type: "uint32" },
  { name: "unknownDword10", type: "uint32" },
  { name: "unknownDword11", type: "uint32" },
  { name: "unknownDword12", type: "uint32" },
  { name: "unknownDword13", type: "uint32" },
  { name: "unknownBoolean1", type: "boolean" },
  { name: "unknownDword14", type: "uint32" },
];

var weaponStatsDataSchema = [
  { name: "unknownData1", type: "schema", fields: profileStatsSubSchema1 },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  { name: "unknownDword9", type: "uint32" },
  { name: "unknownDword10", type: "uint32" },
  { name: "unknownDword11", type: "uint32" },
  { name: "unknownData2", type: "schema", fields: weaponStatsDataSubSchema1 },
  { name: "unknownData3", type: "schema", fields: weaponStatsDataSubSchema1 },
];

var vehicleStatsDataSchema = [
  { name: "unknownData1", type: "schema", fields: profileStatsSubSchema1 },
  { name: "unknownData2", type: "schema", fields: weaponStatsDataSubSchema1 },
];

var facilityStatsDataSchema = [
  { name: "unknownData1", type: "schema", fields: weaponStatsDataSubSchema1 },
];

var itemBaseSchema = [
  { name: "itemId", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownGuid1", type: "uint64" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownBoolean1", type: "boolean" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownByte1", type: "uint8" },
  {
    name: "unknownData",
    type: "variabletype8",
    types: {
      0: [],
      1: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
      ],
    },
  },
];

var effectTagDataSchema = [
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },

  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },

  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownGuid1", type: "uint64" },
      { name: "unknownGuid2", type: "uint64" },
    ],
  },

  {
    name: "unknownData2",
    type: "schema",
    fields: [
      { name: "unknownGuid1", type: "uint64" },
      { name: "unknownGuid2", type: "uint64" },
      { name: "unknownVector1", type: "floatvector4" },
    ],
  },

  {
    name: "unknownData3",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownDword3", type: "uint32" },
    ],
  },

  { name: "unknownDword6", type: "uint32" },
  { name: "unknownByte1", type: "uint8" },
];

var targetDataSchema = [{ name: "targetType", type: "uint8" }];

var itemDetailSchema = [{ name: "unknownBoolean1", type: "boolean" }];

var statDataSchema = [
  { name: "statId", type: "uint32" },
  {
    name: "statValue",
    type: "variabletype8",
    types: {
      0: [
        { name: "baseValue", type: "uint32" },
        { name: "modifierValue", type: "uint32" },
      ],
      1: [
        { name: "baseValue", type: "float" },
        { name: "modifierValue", type: "float" },
      ],
    },
  },
];

var itemWeaponDetailSubSchema1 = [
  { name: "statOwnerId", type: "uint32" },
  { name: "statData", type: "schema", fields: statDataSchema },
];

var itemWeaponDetailSubSchema2 = [
  { name: "unknownDword1", type: "uint32" },
  {
    name: "unknownArray1",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      {
        name: "unknownArray1",
        type: "array",
        fields: itemWeaponDetailSubSchema1,
      },
    ],
  },
];

var itemWeaponDetailSchema = [
  { name: "unknownBoolean1", type: "boolean" },
  {
    name: "unknownArray1",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
    ],
  },
  {
    name: "unknownArray2",
    type: "array8",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      {
        name: "unknownArray1",
        type: "array8",
        fields: [
          { name: "unknownByte1", type: "uint8" },
          { name: "unknownDword1", type: "uint32" },
          { name: "unknownDword2", type: "uint32" },
          { name: "unknownDword3", type: "uint32" },
        ],
      },
    ],
  },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownByte2", type: "uint8" },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownByte3", type: "uint8" },
  { name: "unknownFloat1", type: "float" },
  { name: "unknownByte4", type: "uint8" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownArray3", type: "array", fields: itemWeaponDetailSubSchema1 },
  { name: "unknownArray4", type: "array", fields: itemWeaponDetailSubSchema2 },
];

var weaponPackets = [
  [
    "Weapon.FireStateUpdate",
    0x8201,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownByte2", type: "uint8" },
      ],
    },
  ],
  ["Weapon.FireStateTargetedUpdate", 0x8202, {}],
  [
    "Weapon.Fire",
    0x8203,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "position", type: "floatvector3" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
      ],
    },
  ],
  ["Weapon.FireWithDefinitionMapping", 0x8204, {}],
  ["Weapon.FireNoProjectile", 0x8205, {}],
  ["Weapon.ProjectileHitReport", 0x8206, {}],
  [
    "Weapon.ReloadRequest",
    0x8207,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  ["Weapon.Reload", 0x8208, {}],
  ["Weapon.ReloadInterrupt", 0x8209, {}],
  ["Weapon.ReloadComplete", 0x820a, {}],
  [
    "Weapon.SwitchFireModeRequest",
    0x820b,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownByte2", type: "uint8" },
        { name: "unknownByte3", type: "uint8" },
      ],
    },
  ],
  ["Weapon.LockOnGuidUpdate", 0x820c, {}],
  ["Weapon.LockOnLocationUpdate", 0x820d, {}],
  [
    "Weapon.StatUpdate",
    0x820e,
    {
      fields: [
        {
          name: "statData",
          type: "array",
          fields: [
            { name: "guid", type: "uint64" },
            { name: "unknownBoolean1", type: "boolean" },
            {
              name: "statUpdates",
              type: "array",
              fields: [
                { name: "statCategory", type: "uint8" },
                {
                  name: "statUpdateData",
                  type: "schema",
                  fields: itemWeaponDetailSubSchema1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  ["Weapon.DebugProjectile", 0x820f, {}],
  ["Weapon.AddFireGroup", 0x8210, {}],
  ["Weapon.RemoveFireGroup", 0x8211, {}],
  ["Weapon.ReplaceFireGroup", 0x8212, {}],
  ["Weapon.GuidedUpdate", 0x8213, {}],
  ["Weapon.RemoteWeapon.Reset", 0x821401, {}],
  ["Weapon.RemoteWeapon.AddWeapon", 0x821402, {}],
  ["Weapon.RemoteWeapon.RemoveWeapon", 0x821403, {}],
  [
    "Weapon.RemoteWeapon.Update",
    0x821404,
    {
      fields: [
        {
          name: "unknownUint1",
          type: "custom",
          parser: readUnsignedIntWith2bitLengthValue,
          packer: packUnsignedIntWith2bitLengthValue,
        },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownQword1", type: "uint64" },
        { name: "unknownByte2", type: "uint8" },
        {
          name: "unknownUint2",
          type: "custom",
          parser: readUnsignedIntWith2bitLengthValue,
          packer: packUnsignedIntWith2bitLengthValue,
        },
      ],
    },
  ],
  ["Weapon.RemoteWeapon.Update.FireState", 0x82140401, {}],
  ["Weapon.RemoteWeapon.Update.Empty", 0x82140402, {}],
  ["Weapon.RemoteWeapon.Update.Reload", 0x82140403, {}],
  ["Weapon.RemoteWeapon.Update.ReloadLoopEnd", 0x82140404, {}],
  ["Weapon.RemoteWeapon.Update.ReloadInterrupt", 0x82140405, {}],
  ["Weapon.RemoteWeapon.Update.SwitchFireMode", 0x82140406, {}],
  ["Weapon.RemoteWeapon.Update.StatUpdate", 0x82140407, {}],
  ["Weapon.RemoteWeapon.Update.AddFireGroup", 0x82140408, {}],
  ["Weapon.RemoteWeapon.Update.RemoveFireGroup", 0x82140409, {}],
  ["Weapon.RemoteWeapon.Update.ReplaceFireGroup", 0x8214040a, {}],
  ["Weapon.RemoteWeapon.Update.ProjectileLaunch", 0x8214040b, {}],
  ["Weapon.RemoteWeapon.Update.Chamber", 0x8214040c, {}],
  ["Weapon.RemoteWeapon.Update.Throw", 0x8214040d, {}],
  ["Weapon.RemoteWeapon.Update.Trigger", 0x8214040e, {}],
  ["Weapon.RemoteWeapon.Update.ChamberInterrupt", 0x8214040f, {}],
  ["Weapon.RemoteWeapon.ProjectileLaunchHint", 0x821405, {}],
  ["Weapon.RemoteWeapon.ProjectileDetonateHint", 0x821406, {}],
  ["Weapon.RemoteWeapon.ProjectileRemoteContactReport", 0x821407, {}],
  ["Weapon.ChamberRound", 0x8215, {}],
  ["Weapon.GuidedSetNonSeeking", 0x8216, {}],
  ["Weapon.ChamberInterrupt", 0x8217, {}],
  ["Weapon.GuidedExplode", 0x8218, {}],
  ["Weapon.DestroyNpcProjectile", 0x8219, {}],
  ["Weapon.WeaponToggleEffects", 0x821a, {}],
  [
    "Weapon.Reset",
    0x821b,
    {
      fields: [
        { name: "unknownQword1", type: "uint64" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownByte1", type: "uint8" },
      ],
    },
  ],
  ["Weapon.ProjectileSpawnNpc", 0x821c, {}],
  ["Weapon.FireRejected", 0x821d, {}],
  [
    "Weapon.MultiWeapon",
    0x821e,
    {
      fields: [
        {
          name: "packets",
          type: "custom",
          parser: parseMultiWeaponPacket,
          packer: packMultiWeaponPacket,
        },
      ],
    },
  ],
  ["Weapon.WeaponFireHint", 0x821f, {}],
  ["Weapon.ProjectileContactReport", 0x8220, {}],
  ["Weapon.MeleeHitMaterial", 0x8221, {}],
  ["Weapon.ProjectileSpawnAttachedNp", 0x8222, {}],
  ["Weapon.AddDebugLogEntry", 0x8223, {}],
];

var weaponPacketTypes = {},
  weaponPacketDescriptors = {};

PacketTable.build(weaponPackets, weaponPacketTypes, weaponPacketDescriptors);

function parseMultiWeaponPacket(data, offset) {
  var startOffset = offset,
    packets = [];
  var n = data.readUInt32LE(offset);
  offset += 4;

  for (var i = 0; i < n; i++) {
    var size = data.readUInt32LE(offset);
    offset += 4;

    var subData = data.slice(offset, offset + size);
    offset += size;

    packets.push(parseWeaponPacket(subData, 2).value);
  }
  return {
    value: packets,
    length: startOffset - offset,
  };
}

function packMultiWeaponPacket(obj) {}

function parseWeaponPacket(data, offset) {
  var obj = {};

  obj.gameTime = data.readUInt32LE(offset);
  var tmpData = data.slice(offset + 4);

  var weaponPacketData = new Buffer.alloc(tmpData.length + 1);
  weaponPacketData.writeUInt8(0x85, 0);
  tmpData.copy(weaponPacketData, 1);

  var weaponPacket = readPacketType(weaponPacketData, weaponPacketDescriptors);
  if (weaponPacket.packet) {
    obj.packetType = weaponPacket.packetType;
    obj.packetName = weaponPacket.packet.name;
    if (weaponPacket.packet.schema) {
      obj.packet = DataSchema.parse(
        weaponPacket.packet.schema,
        weaponPacketData,
        weaponPacket.length,
        null
      ).result;
    }
  } else {
    obj.packetType = weaponPacket.packetType;
    obj.packetData = data;
  }
  return {
    value: obj,
    length: data.length - offset,
  };
}

function packWeaponPacket(obj) {
  var subObj = obj.packet,
    subName = obj.packetName,
    subType = weaponPacketTypes[subName],
    data;
  if (weaponPacketDescriptors[subType]) {
    var subPacket = weaponPacketDescriptors[subType],
      subTypeData = writePacketType(subType),
      subData = DataSchema.pack(subPacket.schema, subObj).data;
    subData = Buffer.concat([subTypeData.slice(1), subData]);
    data = new Buffer.alloc(subData.length + 4);
    data.writeUInt32LE((obj.gameTime & 0xffffffff) >>> 0, 0);
    subData.copy(data, 4);
  } else {
    throw "Unknown weapon packet type: " + subType;
  }
  return data;
}

function parseItemData(data, offset, referenceData) {
  var startOffset = offset,
    detailItem,
    detailSchema;
  var baseItem = DataSchema.parse(itemBaseSchema, data, offset);
  offset += baseItem.length;

  if (referenceData.itemTypes[baseItem.result.itemId] == "Weapon") {
    detailSchema = itemWeaponDetailSchema;
  } else {
    detailSchema = itemDetailSchema;
  }

  detailItem = DataSchema.parse(detailSchema, data, offset);

  offset += detailItem.length;

  return {
    value: {
      baseItem: baseItem.result,
      detail: detailItem.result,
    },
    length: offset - startOffset,
  };
}

function packItemData(obj, referenceData) {
  var baseData = DataSchema.pack(itemBaseSchema, obj.baseItem),
    detailData,
    detailSchema;

  if (referenceData.itemTypes[obj.baseItem.itemId] == "Weapon") {
    detailSchema = itemWeaponDetailSchema;
  } else {
    detailSchema = itemDetailSchema;
  }

  detailData = DataSchema.pack(detailSchema, obj.detail);
  return Buffer.concat([baseData.data, detailData.data]);
}

var resourceEventDataSubSchema = [
  {
    name: "resourceData",
    type: "schema",
    fields: [
      { name: "resourceId", type: "uint32" },
      { name: "resourceType", type: "uint32" },
    ],
  },
  {
    name: "unknownArray1",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      {
        name: "unknownData1",
        type: "schema",
        fields: [
          { name: "unknownDword1", type: "uint32" },
          { name: "unknownFloat1", type: "float" },
          { name: "unknownFloat2", type: "float" },
        ],
      },
    ],
  },
  {
    name: "unknownData2",
    type: "schema",
    fields: [
      { name: "max_value", type: "uint32" },
      { name: "initial_value", type: "uint32" },
      { name: "unknownFloat1", type: "float" },
      { name: "unknownFloat2", type: "float" },
      { name: "unknownFloat3", type: "float" },
      { name: "unknownDword3", type: "uint32" },
      { name: "unknownDword4", type: "uint32" },
      { name: "unknownDword5", type: "uint32" },
    ],
  },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownByte2", type: "uint8" },
  { name: "unknownTime1", type: "uint64" },
  { name: "unknownTime2", type: "uint64" },
  { name: "unknownTime3", type: "uint64" },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
];

var rewardBundleDataSchema = [
  { name: "unknownByte1", type: "boolean" },
  {
    name: "currency",
    type: "array",
    fields: [
      { name: "currencyId", type: "uint32" },
      { name: "quantity", type: "uint32" },
    ],
  },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownByte2", type: "uint8" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "time", type: "uint64" },
  { name: "characterId", type: "uint64" },
  { name: "nameId", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  { name: "imageSetId", type: "uint32" },
  {
    name: "entries",
    type: "array",
    fields: [
      {
        name: "entryData",
        type: "variabletype8",
        types: {
          1: [
            {
              name: "unknownData1",
              type: "schema",
              fields: [
                { name: "unknownBoolean1", type: "boolean" },
                { name: "imageSetId", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "nameId", type: "uint32" },
                { name: "quantity", type: "uint32" },
                { name: "itemId", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownString1", type: "string" },
                { name: "unknownDword7", type: "uint32" },
                { name: "unknownDword8", type: "uint32" },
              ],
            },
          ],
        },
      }, // RewardBundleBase_GetEntryFromType
    ],
  },
  { name: "unknownDword10", type: "uint32" },
];

var objectiveDataSchema = [
  { name: "objectiveId", type: "uint32" },
  { name: "nameId", type: "uint32" },
  { name: "descriptionId", type: "uint32" },
  { name: "rewardData", type: "schema", fields: rewardBundleDataSchema },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownByte2", type: "uint8" },
  { name: "unknownByte3", type: "uint8" },
  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownDword3", type: "uint32" },
      { name: "unknownDword4", type: "uint32" },
    ],
  },
  { name: "unknownByte4", type: "uint8" },
];

var achievementDataSchema = [
  { name: "achievementId", type: "uint32" },
  { name: "unknownBoolean1", type: "uint32" },
  { name: "nameId", type: "uint32" },
  { name: "descriptionId", type: "uint32" },
  { name: "timeStarted", type: "uint64" },
  { name: "timeFinished", type: "uint64" },
  { name: "progress", type: "float" },
  {
    name: "objectives",
    type: "array",
    fields: [
      { name: "index", type: "uint32" },
      { name: "objectiveData", type: "schema", fields: objectiveDataSchema },
    ],
  },
  { name: "iconId", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownDword6", type: "uint32" },
  { name: "points", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  { name: "unknownBoolean2", type: "boolean" },
  { name: "unknownDword9", type: "uint32" },
];

var loadoutDataSubSchema1 = [
  { name: "loadoutId", type: "uint32" },
  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownByte1", type: "uint8" },
    ],
  },
  { name: "unknownDword2", type: "uint32" },
  {
    name: "unknownData2",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "loadoutName", type: "string" },
    ],
  },
  { name: "tintItemId", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "decalItemId", type: "uint32" },
  {
    name: "loadoutSlots",
    type: "array",
    fields: [
      { name: "loadoutSlotId", type: "uint32" },
      {
        name: "loadoutSlotData",
        type: "schema",
        fields: [
          { name: "index", type: "uint32" },
          {
            name: "loadoutSlotItem",
            type: "schema",
            fields: [
              { name: "itemLineId", type: "uint32" },
              { name: "flags", type: "uint8" },
              {
                name: "attachments",
                type: "array",
                fields: [{ name: "attachmentId", type: "uint32" }],
              },
              {
                name: "attachmentClasses",
                type: "array",
                fields: [
                  { name: "classId", type: "uint32" },
                  { name: "attachmentId", type: "uint32" },
                ],
              },
            ],
          },
          { name: "tintItemId", type: "uint32" },
          { name: "itemSlot", type: "uint32" },
        ],
      },
    ],
  },
];

var loadoutDataSubSchema2 = [
  { name: "unknownDword1", type: "uint32" },
  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownByte1", type: "uint8" },
    ],
  },
  { name: "unknownString1", type: "string" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownDword5", type: "uint32" },
  {
    name: "unknownArray1",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      {
        name: "unknownData1",
        type: "schema",
        fields: [
          { name: "unknownDword1", type: "uint32" },

          {
            name: "unknownData1",
            type: "schema",
            fields: [
              { name: "unknownDword1", type: "uint32" },
              { name: "unknownByte1", type: "uint8" },
              {
                name: "unknownArray1",
                type: "array",
                fields: [{ name: "unknownDword1", type: "uint32" }],
              },
              {
                name: "unknownArray2",
                type: "array",
                fields: [
                  { name: "unknownDword1", type: "uint32" },
                  { name: "unknownDword2", type: "uint32" },
                ],
              },
            ],
          },

          { name: "unknownDword2", type: "uint32" },
          { name: "unknownDword3", type: "uint32" },
        ],
      },
    ],
  },
];

var fullNpcDataSchema = [
  {
    name: "transient_id",
    type: "custom",
    parser: readUnsignedIntWith2bitLengthValue,
    packer: packUnsignedIntWith2bitLengthValue,
  },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  {
    name: "attachments",
    type: "array",
    fields: [
      { name: "unknownString1", type: "string" },
      { name: "unknownString2", type: "string" },
      { name: "unknownString3", type: "string" },
      { name: "unknownString4", type: "string" },
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownDword3", type: "uint32" },
    ],
  },
  { name: "unknownString1", type: "string" },
  { name: "unknownString2", type: "string" },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownFloat1", type: "float" },
  { name: "unknownDword5", type: "uint32" },
  { name: "unknownVector1", type: "floatvector3" },
  { name: "unknownVector2", type: "floatvector3" },
  { name: "unknownFloat2", type: "float" },
  { name: "unknownDword6", type: "uint32" },
  { name: "unknownDword7", type: "uint32" },
  { name: "unknownDword8", type: "uint32" },
  {
    name: "effectTags",
    type: "array",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownDword3", type: "uint32" },
      { name: "unknownDword4", type: "uint32" },
      { name: "unknownDword5", type: "uint32" },
      { name: "unknownDword6", type: "uint32" },
      { name: "unknownDword7", type: "uint32" },
      { name: "unknownDword8", type: "uint32" },
      { name: "unknownDword9", type: "uint32" },
      { name: "unknownFloat1", type: "float" },
      { name: "unknownDword10", type: "uint32" },
      { name: "unknownQword1", type: "uint64" },
      { name: "unknownQword2", type: "uint64" },
      { name: "unknownQword3", type: "uint64" },
      { name: "unknownGuid1", type: "uint64" },
      { name: "unknownDword11", type: "uint32" },
      { name: "unknownDword12", type: "uint32" },
      { name: "unknownDword13", type: "uint32" },
      { name: "unknownDword14", type: "uint32" },
      { name: "unknownDword15", type: "uint32" },
      { name: "unknownDword16", type: "uint32" },
      { name: "unknownDword17", type: "uint32" },
      { name: "unknownGuid2", type: "uint64" },
      { name: "unknownDword18", type: "uint32" },
      { name: "unknownDword19", type: "uint32" },
      { name: "unknownDword20", type: "uint32" },
      { name: "unknownDword21", type: "uint32" },
      { name: "unknownGuid3", type: "uint64" },
      { name: "unknownGuid4", type: "uint64" },
      { name: "unknownDword22", type: "uint32" },
      { name: "unknownQword4", type: "uint64" },
      { name: "unknownDword23", type: "uint32" },
    ],
  },
  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownDword1", type: "uint32" },
      { name: "unknownString1", type: "string" },
      { name: "unknownString2", type: "string" },
      { name: "unknownDword2", type: "uint32" },
      { name: "unknownString3", type: "string" },
    ],
  },
  { name: "unknownVector4", type: "floatvector4" },
  { name: "unknownDword9", type: "uint32" },
  { name: "unknownDword10", type: "uint32" },
  { name: "unknownDword11", type: "uint32" },
  { name: "characterId", type: "uint64" },
  { name: "unknownFloat3", type: "float" },
  { name: "targetData", type: "schema", fields: targetDataSchema },
  {
    name: "characterVariables",
    type: "array",
    fields: [
      { name: "unknownString1", type: "string" },
      { name: "unknownDword1", type: "uint32" },
    ],
  },
  { name: "unknownDword12", type: "uint32" },
  { name: "unknownFloat4", type: "float" },
  { name: "unknownVector5", type: "floatvector4" },
  { name: "unknownDword13", type: "uint32" },
  { name: "unknownFloat5", type: "float" },
  { name: "unknownFloat6", type: "float" },
  {
    name: "unknownData2",
    type: "schema",
    fields: [{ name: "unknownFloat1", type: "float" }],
  },
  { name: "unknownDword14", type: "uint32" },
  { name: "unknownDword15", type: "uint32" },
  { name: "unknownDword16", type: "uint32" },
  { name: "unknownDword17", type: "uint32" },
  { name: "unknownDword18", type: "uint32" },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownByte2", type: "uint8" },
  { name: "unknownDword19", type: "uint32" },
  { name: "unknownDword20", type: "uint32" },
  { name: "unknownDword21", type: "uint32" },
  { name: "resources", type: "array", fields: resourceEventDataSubSchema },
  { name: "unknownGuid1", type: "uint64" },
  {
    name: "unknownData3",
    type: "schema",
    fields: [{ name: "unknownDword1", type: "uint32" }],
  },
  { name: "unknownDword22", type: "uint32" },
  { name: "unknownBytes1", type: "byteswithlength" },
  { name: "unknownBytes2", type: "byteswithlength" },
];

var respawnLocationDataSchema = [
  { name: "guid", type: "uint64" },
  { name: "respawnType", type: "uint8" },
  { name: "position", type: "floatvector4" },
  { name: "unknownDword1", type: "uint32" },
  { name: "unknownDword2", type: "uint32" },
  { name: "iconId1", type: "uint32" },
  { name: "iconId2", type: "uint32" },
  { name: "respawnTotalTime", type: "uint32" },
  { name: "unknownDword3", type: "uint32" },
  { name: "nameId", type: "uint32" },
  { name: "distance", type: "float" },
  { name: "unknownByte1", type: "uint8" },
  { name: "unknownByte2", type: "uint8" },
  {
    name: "unknownData1",
    type: "schema",
    fields: [
      { name: "unknownByte1", type: "uint8" },
      { name: "unknownByte2", type: "uint8" },
      { name: "unknownByte3", type: "uint8" },
      { name: "unknownByte4", type: "uint8" },
      { name: "unknownByte5", type: "uint8" },
    ],
  },
  { name: "unknownDword4", type: "uint32" },
  { name: "unknownByte3", type: "uint8" },
  { name: "unknownByte4", type: "uint8" },
];

var packets = [
  ["Server", 0x01, {}],
  ["ClientFinishedLoading", 0x02, {}],
  [
    "SendSelfToClient",
    0x03,
    {
      fields: [
        {
          name: "data",
          type: "byteswithlength",
          fields: [
            { name: "guid", type: "uint64" },
            { name: "characterId", type: "uint64" },
            {
              name: "unknownUint1",
              type: "custom",
              parser: readUnsignedIntWith2bitLengthValue,
              packer: packUnsignedIntWith2bitLengthValue,
            },
            { name: "lastLoginDate", type: "uint64" },
            { name: "actorModelId", type: "uint32" },
            { name: "headActor", type: "string" },
            { name: "unknownString1", type: "string" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            { name: "unknownString2", type: "string" },
            { name: "unknownString3", type: "string" },
            { name: "unknownString4", type: "string" },
            { name: "headId", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "factionId", type: "uint32" },
            { name: "unknownDword9", type: "uint32" },
            { name: "unknownDword10", type: "uint32" },
            { name: "position", type: "floatvector4" },
            { name: "unknownVector2", type: "floatvector4" },
            {
              name: "identity",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "characterName", type: "string" },
                { name: "unknownString1", type: "string" },
              ],
            },
            { name: "unknownDword14", type: "uint32" },
            {
              name: "currency",
              type: "array",
              fields: [
                { name: "currencyId", type: "uint32" },
                { name: "quantity", type: "uint32" },
              ],
            },
            { name: "creationDate", type: "uint64" },
            { name: "unknownDword15", type: "uint32" },
            { name: "unknownDword16", type: "uint32" },
            { name: "unknownBoolean1", type: "boolean" },
            { name: "unknownBoolean2", type: "boolean" },
            { name: "unknownDword17", type: "uint32" },
            { name: "unknownDword18", type: "uint32" },
            { name: "unknownBoolean3", type: "boolean" },
            { name: "unknownDword19", type: "uint32" },
            { name: "gender", type: "uint32" },
            { name: "unknownDword21", type: "uint32" },
            { name: "unknownDword22", type: "uint32" },
            { name: "unknownDword23", type: "uint32" },
            { name: "unknownBoolean4", type: "boolean" },
            { name: "unknownTime1", type: "uint64" },
            { name: "unknownTime2", type: "uint64" },
            { name: "unknownTime3", type: "uint64" },
            { name: "unknownDword24", type: "uint32" },
            { name: "unknownBoolean5", type: "boolean" },
            { name: "unknownDword25", type: "uint32" },
            { name: "profiles", type: "array", fields: profileDataSchema },
            { name: "currentProfile", type: "uint32" },
            {
              name: "unknownArray2",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "int32" },
                { name: "unknownDword2", type: "int32" },
              ],
            },
            {
              name: "collections",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownDword7", type: "uint32" },

                {
                  name: "unknownData1",
                  type: "schema",
                  fields: rewardBundleDataSchema,
                },

                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                        { name: "unknownDword5", type: "uint32" },
                        { name: "unknownDword6", type: "uint32" },
                        { name: "unknownDword7", type: "uint32" },
                        { name: "unknownBoolean1", type: "boolean" },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: "inventory",
              type: "schema",
              fields: [
                {
                  name: "items",
                  type: "array",
                  fields: [
                    {
                      name: "itemData",
                      type: "custom",
                      parser: parseItemData,
                      packer: packItemData,
                    },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
              ],
            },
            { name: "unknownDword28", type: "uint32" },
            {
              name: "characterQuests",
              type: "schema",
              fields: [
                {
                  name: "quests",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                    { name: "unknownBoolean1", type: "boolean" },
                    { name: "unknownGuid1", type: "uint64" },
                    { name: "unknownDword5", type: "uint32" },
                    { name: "unknownBoolean2", type: "boolean" },
                    { name: "unknownFloat1", type: "float" },

                    {
                      name: "reward",
                      type: "schema",
                      fields: rewardBundleDataSchema,
                    },

                    {
                      name: "unknownArray2",
                      type: "array",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownBoolean1", type: "boolean" },

                        {
                          name: "reward",
                          type: "schema",
                          fields: rewardBundleDataSchema,
                        },

                        { name: "unknownDword14", type: "uint32" },
                        { name: "unknownDword15", type: "uint32" },
                        { name: "unknownDword16", type: "uint32" },
                        { name: "unknownDword17", type: "uint32" },
                        { name: "unknownBoolean4", type: "boolean" },

                        { name: "unknownDword18", type: "uint32" },
                        { name: "unknownDword19", type: "uint32" },
                        { name: "unknownDword20", type: "uint32" },
                        { name: "unknownDword21", type: "uint32" },
                      ],
                    },
                    { name: "unknownDword6", type: "uint32" },
                    { name: "unknownBoolean3", type: "boolean" },
                    { name: "unknownBoolean4", type: "boolean" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
              ],
            },
            {
              name: "characterAchievements",
              type: "array",
              fields: achievementDataSchema,
            },
            {
              name: "acquaintances",
              type: "array",
              fields: [
                { name: "unknownGuid1", type: "uint64" },
                { name: "unknownString1", type: "string" },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownGuid2", type: "uint64" },
                { name: "unknownBoolean1", type: "boolean" },
              ],
            },
            {
              name: "recipes",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownDword7", type: "uint32" },
                {
                  name: "components",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                    { name: "unknownDword5", type: "uint32" },
                    { name: "unknownQword1", type: "uint64" },
                    { name: "unknownDword6", type: "uint32" },
                    { name: "unknownDword7", type: "uint32" },
                  ],
                },
                { name: "unknownDword8", type: "uint32" },
              ],
            },
            {
              name: "mounts",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownQword1", type: "uint64" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownString1", type: "string" },
              ],
            },
            {
              name: "unknownCoinStoreData",
              type: "schema",
              fields: [
                { name: "unknownBoolean1", type: "boolean" },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [{ name: "unknownDword1", type: "uint32" }],
                },
              ],
            },
            {
              name: "unknownArray10",
              type: "array",
              fields: [{ name: "unknownDword1", type: "uint32" }],
            },
            {
              name: "unknownEffectArray",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                        { name: "unknownDword5", type: "uint32" },
                        { name: "unknownDword6", type: "uint32" },
                        { name: "unknownDword7", type: "uint32" },
                        { name: "unknownDword8", type: "uint32" },
                        { name: "unknownDword9", type: "uint32" },
                        { name: "unknownFloat1", type: "float" },
                        { name: "unknownDword10", type: "uint32" },
                        { name: "unknownQword1", type: "uint64" },
                        { name: "unknownQword2", type: "uint64" },
                        { name: "unknownQword3", type: "uint64" },
                        { name: "unknownGuid1", type: "uint64" },
                        { name: "unknownDword11", type: "uint32" },
                        { name: "unknownDword12", type: "uint32" },
                        { name: "unknownDword13", type: "uint32" },
                        { name: "unknownDword14", type: "uint32" },
                        { name: "unknownDword15", type: "uint32" },
                        { name: "unknownDword16", type: "uint32" },
                        { name: "unknownDword17", type: "uint32" },
                        { name: "unknownGuid2", type: "uint64" },
                        { name: "unknownDword18", type: "uint32" },
                        { name: "unknownDword19", type: "uint32" },
                        { name: "unknownByte1", type: "uint8" },
                        { name: "unknownDword20", type: "uint32" },
                        { name: "unknownGuid3", type: "uint64" },
                        { name: "unknownGuid4", type: "uint64" },
                        { name: "unknownDword21", type: "uint32" },
                        { name: "unknownQword4", type: "uint64" },
                        { name: "unknownDword22", type: "uint32" },
                      ],
                    },
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownBoolean1", type: "boolean" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    {
                      name: "unknownArray1",
                      type: "array",
                      fields: [{ name: "unknownDword1", type: "uint32" }],
                    },
                  ],
                },
              ],
            },
            {
              name: "stats",
              type: "array",
              fields: [
                { name: "statId", type: "uint32" },
                {
                  name: "statData",
                  type: "schema",
                  fields: [
                    { name: "statId", type: "uint32" },
                    {
                      name: "statValue",
                      type: "variabletype8",
                      types: {
                        0: [
                          { name: "base", type: "uint32" },
                          { name: "modifier", type: "uint32" },
                        ],
                        1: [
                          { name: "base", type: "float" },
                          { name: "modifier", type: "float" },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
            {
              name: "playerTitles",
              type: "array",
              fields: [
                { name: "titleId", type: "uint32" },
                { name: "titleType", type: "uint32" },
                { name: "stringId", type: "uint32" },
              ],
            },
            { name: "currentPlayerTitle", type: "uint32" },
            {
              name: "unknownArray13",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
              ],
            },
            {
              name: "unknownArray14",
              type: "array",
              fields: [{ name: "unknownDword1", type: "uint32" }],
            },
            { name: "unknownDword33", type: "uint32" },
            {
              name: "unknownArray15",
              type: "array",
              fields: [{ name: "unknownDword1", type: "uint32" }],
            },
            {
              name: "unknownArray16",
              type: "array",
              fields: [{ name: "unknownDword1", type: "uint32" }],
            },
            {
              name: "unknownArray17",
              type: "array",
              fields: [{ name: "unknownBoolean1", type: "boolean" }],
            },
            // { name: "unknownDword34",           type: "uint32" },
            // { name: "unknownDword35",           type: "uint32" },
            // { name: "unknownDword36",           type: "uint32" },
            {
              name: "unknownArray18",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownDword7", type: "uint32" },
                { name: "unknownByte1", type: "uint8" },
              ],
            },
            {
              name: "unknownArray19",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownDword7", type: "uint32" },
                { name: "unknownByte1", type: "uint8" },
              ],
            },
            {
              name: "unknownArray20",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
              ],
            },
            {
              name: "unknownData1",
              type: "schema",
              fields: [
                {
                  name: "abilityLines",
                  type: "array",
                  fields: [
                    { name: "abilityLineId", type: "uint32" },
                    {
                      name: "abilityLineData",
                      type: "schema",
                      fields: [
                        { name: "abilityLineId", type: "uint32" },
                        { name: "abilityId", type: "uint32" },
                        { name: "abilityLineIndex", type: "uint32" },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                  ],
                },
                {
                  name: "unknownArray3",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                  ],
                },
                {
                  name: "unknownArray4",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                {
                  name: "unknownArray5",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownGuid1", type: "uint64" },
                        { name: "unknownGuid2", type: "uint64" },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray6",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownGuid1", type: "uint64" },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray7",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                  ],
                },
              ],
            },
            {
              name: "unknownArray21",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
              ],
            },
            {
              name: "unknownArray22",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },

                { name: "unknownDword2", type: "uint32" },
                { name: "unknownGuid1", type: "uint64" },
                { name: "unknownFloat1", type: "float" },

                { name: "unknownDword3", type: "uint32" },
              ],
            },
            {
              name: "unknownArray23",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownByte1", type: "uint8" },

                { name: "unknownDword2", type: "uint32" },
                { name: "unknownGuid1", type: "uint64" },
                { name: "unknownFloat1", type: "float" },

                { name: "unknownDword3", type: "uint32" },
                { name: "unknownByte2", type: "uint8" },
              ],
            },
            { name: "unknownByte1", type: "uint8" },

            {
              name: "unknownData2",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                  ],
                },
                {
                  name: "unknownData2",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                  ],
                },
                { name: "unknownDword2", type: "uint32" },
              ],
            },
            { name: "unknownDword37", type: "uint32" },
            {
              name: "unknownArray24",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownFloat1", type: "float" },
              ],
            },

            {
              name: "unknownData3",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
              ],
            },

            {
              name: "unknownArray25",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownGuid1", type: "uint64" },
                { name: "unknownFloat1", type: "float" },
                { name: "unknownFloat2", type: "float" },
              ],
            },

            {
              name: "unknownArray26",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownGuid1", type: "uint64" },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                  ],
                },
              ],
            },

            {
              name: "unknownArray27",
              type: "array",
              fields: [
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownGuid1", type: "uint64" },
                    { name: "unknownGuid2", type: "uint64" },
                  ],
                },
                {
                  name: "effectTagData",
                  type: "schema",
                  fields: effectTagDataSchema,
                },
              ],
            },

            {
              name: "unknownArray28",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownString1", type: "string" },
                    { name: "unknownString2", type: "string" },
                  ],
                },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownGuid1", type: "uint64" },
                        { name: "unknownString1", type: "string" },
                        { name: "unknownString2", type: "string" },
                      ],
                    },
                  ],
                },
              ],
            },

            {
              name: "playerRanks",
              type: "array",
              fields: [
                { name: "rankId", type: "uint32" },
                {
                  name: "rankData",
                  type: "schema",
                  fields: [
                    { name: "rankId", type: "uint32" },
                    { name: "score", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "rank", type: "uint32" },
                    { name: "rankProgress", type: "uint32" },
                  ],
                },
              ],
            },

            {
              name: "unknownData4",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
              ],
            },

            {
              name: "unknownData5",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
              ],
            },

            {
              name: "implantSlots",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                  ],
                },
              ],
            },

            {
              name: "itemTimerData",
              type: "schema",
              fields: [
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownFloat1", type: "float" },
                    { name: "unknownTime1", type: "uint64" },
                    { name: "unknownTime2", type: "uint64" },
                  ],
                },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownFloat1", type: "float" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownTime2", type: "uint64" },
                      ],
                    },
                    { name: "unknownDword2", type: "uint32" },
                  ],
                },
                {
                  name: "unknownData2",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownFloat1", type: "float" },
                    { name: "unknownTime1", type: "uint64" },
                  ],
                },
                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownFloat1", type: "float" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray3",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownFloat1", type: "float" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownByte1", type: "uint8" },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray4",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownFloat1", type: "float" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                        { name: "unknownByte1", type: "uint8" },
                      ],
                    },
                  ],
                },
                { name: "unknownByte1", type: "uint8" },
              ],
            },

            {
              name: "characterLoadoutData",
              type: "schema",
              fields: [
                {
                  name: "loadouts",
                  type: "array",
                  fields: [
                    { name: "loadoutId", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    {
                      name: "loadoutData",
                      type: "schema",
                      fields: loadoutDataSubSchema1,
                    },
                  ],
                },
                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: loadoutDataSubSchema2,
                    },
                  ],
                },
                {
                  name: "unknownArray3",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },

                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownByte1", type: "uint8" },
                        {
                          name: "unknownArray1",
                          type: "array",
                          fields: [{ name: "unknownDword1", type: "uint32" }],
                        },
                        {
                          name: "unknownArray2",
                          type: "array",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: loadoutDataSubSchema1,
                },
                {
                  name: "unknownData2",
                  type: "schema",
                  fields: loadoutDataSubSchema2,
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
              ],
            },

            {
              name: "missionData",
              type: "schema",
              fields: [
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownByte1", type: "uint8" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                      ],
                    },
                    { name: "unknownDword1", type: "uint32" },
                  ],
                },
                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownByte1", type: "uint8" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                      ],
                    },
                    { name: "unknownFloat1", type: "float" },
                  ],
                },
                {
                  name: "unknownArray3",
                  type: "array",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownByte1", type: "uint8" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                      ],
                    },
                    { name: "unknownGuid1", type: "uint64" },
                  ],
                },
                {
                  name: "unknownArray4",
                  type: "array",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        {
                          name: "unknownData1",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownTime1", type: "uint64" },
                            { name: "unknownByte1", type: "uint8" },
                          ],
                        },
                        {
                          name: "unknownData2",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownTime1", type: "uint64" },
                            { name: "unknownByte1", type: "uint8" },
                          ],
                        },
                        {
                          name: "unknownData3",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                            { name: "unknownDword3", type: "uint32" },
                          ],
                        },
                        { name: "unknownDword1", type: "uint32" },
                        {
                          name: "unknownData4",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                            { name: "unknownDword3", type: "uint32" },
                            { name: "unknownDword4", type: "uint32" },
                            { name: "unknownVector1", type: "floatvector4" },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: "unknownArray5",
                  type: "array",
                  fields: [
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        {
                          name: "unknownData1",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownTime1", type: "uint64" },
                            { name: "unknownByte1", type: "uint8" },
                          ],
                        },
                        {
                          name: "unknownData2",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownTime1", type: "uint64" },
                            { name: "unknownByte1", type: "uint8" },
                          ],
                        },
                        {
                          name: "unknownData3",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                            { name: "unknownDword3", type: "uint32" },
                          ],
                        },
                        { name: "unknownDword1", type: "uint32" },
                        {
                          name: "unknownData4",
                          type: "schema",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                            { name: "unknownDword3", type: "uint32" },
                            { name: "unknownDword4", type: "uint32" },
                            { name: "unknownVector1", type: "floatvector4" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },

            {
              name: "characterResources",
              type: "array",
              fields: [
                { name: "resourceType", type: "uint32" },
                {
                  name: "resourceData",
                  type: "schema",
                  fields: resourceEventDataSubSchema,
                },
              ],
            },

            {
              name: "characterResourceChargers",
              type: "array",
              fields: [
                { name: "resourceChargerId", type: "uint32" },
                {
                  name: "resourceChargerData",
                  type: "schema",
                  fields: [
                    { name: "resourceChargerId", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    {
                      name: "itemData",
                      type: "schema",
                      fields: [
                        { name: "itemId", type: "uint32" },
                        { name: "itemClass", type: "uint32" },
                      ],
                    },
                  ],
                },
                { name: "unknownByte1", type: "uint8" },
              ],
            },

            {
              name: "skillPointData",
              type: "schema",
              fields: [
                { name: "skillPointsGranted", type: "uint64" },
                { name: "skillPointsTotal", type: "uint64" },
                { name: "skillPointsSpent", type: "uint64" },
                { name: "nextSkillPointPct", type: "double" },
                { name: "unknownTime1", type: "uint64" },
                { name: "unknownDword1", type: "uint32" },
              ],
            },

            {
              name: "skills",
              type: "array",
              fields: [
                { name: "skillLineId", type: "uint32" },
                { name: "skillId", type: "uint32" },
              ],
            },
            { name: "unknownBoolean8", type: "boolean" },
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownDword38", type: "uint32" },
            { name: "unknownQword2", type: "uint64" },
            { name: "unknownQword3", type: "uint64" },
            { name: "unknownDword39", type: "uint32" },
            { name: "unknownDword40", type: "uint32" },
            { name: "unknownBoolean9", type: "boolean" },
          ],
        },
      ],
    },
  ],
  [
    "ClientIsReady",
    0x04,
    {
      fields: [],
    },
  ],
  [
    "ZoneDoneSendingInitialData",
    0x05,
    {
      fields: [],
    },
  ],
  [
    "Chat.Chat",
    0x060100,
    {
      fields: [
        { name: "unknown2", type: "uint16" },
        { name: "channel", type: "uint16" },
        { name: "characterId1", type: "uint64" },
        { name: "characterId2", type: "uint64" },
        { name: "unknown5_0", type: "uint32" },
        { name: "unknown5_1", type: "uint32" },
        { name: "unknown5_2", type: "uint32" },
        { name: "characterName1", type: "string" },
        { name: "unknown5_3", type: "string" },
        { name: "unknown6_0", type: "uint32" },
        { name: "unknown6_1", type: "uint32" },
        { name: "unknown6_2", type: "uint32" },
        { name: "characterName2", type: "string" },
        { name: "unknown6_3", type: "string" },
        { name: "message", type: "string" },
        { name: "position", type: "floatvector4" },
        { name: "unknownGuid", type: "uint64" },
        { name: "unknown13", type: "uint32" },
        { name: "color1", type: "uint32" },
        { name: "color2", type: "uint32" },
        { name: "unknown15", type: "uint8" },
        { name: "unknown16", type: "boolean" },
      ],
    },
  ],
  ["Chat.EnterArea", 0x060200, {}],
  ["Chat.DebugChat", 0x060300, {}],
  ["Chat.FromStringId", 0x060400, {}],
  ["Chat.TellEcho", 0x060500, {}],
  [
    "Chat.ChatText",
    0x060600,
    {
      fields: [
        { name: "message", type: "string" },
        { name: "unknownDword1", type: "uint32" },
        { name: "color", type: "bytes", length: 4 },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownByte3", type: "uint8" },
        { name: "unknownByte4", type: "uint8" },
      ],
    },
  ],
  ["ClientLogout", 0x07, {}],
  ["TargetClientNotOnline", 0x08, {}],
  ["Command.ShowDialog", 0x090100, {}],
  ["AdminCommand.ShowDialog", 0x0a0100, {}],
  ["Command.EndDialog", 0x090200, {}],
  ["AdminCommand.EndDialog", 0x0a0200, {}],
  ["Command.StartDialog", 0x090300, {}],
  ["AdminCommand.StartDialog", 0x0a0300, {}],
  ["Command.PlayerPlaySpeech", 0x090400, {}],
  ["AdminCommand.PlayerPlaySpeech", 0x0a0400, {}],
  ["Command.DialogResponse", 0x090500, {}],
  ["AdminCommand.DialogResponse", 0x0a0500, {}],
  ["Command.PlaySoundAtLocation", 0x090600, {}],
  ["AdminCommand.PlaySoundAtLocation", 0x0a0600, {}],
  [
    "Command.InteractRequest",
    0x090700,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  [
    "AdminCommand.InteractRequest",
    0x0a0700,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  [
    "Command.InteractCancel",
    0x090800,
    {
      fields: [],
    },
  ],
  [
    "AdminCommand.InteractCancel",
    0x0a0800,
    {
      fields: [],
    },
  ],
  [
    "Command.InteractionList",
    0x090900,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknownBoolean1", type: "boolean" },
        {
          name: "unknownArray1",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "unknownDword7", type: "uint32" },
          ],
        },
        { name: "unknownString1", type: "string" },
        { name: "unknownBoolean2", type: "boolean" },
        {
          name: "unknownArray2",
          type: "array",
          fields: [
            { name: "unknownString1", type: "uint32" },
            { name: "unknownFloat2", type: "uint32" },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "unknownDword7", type: "uint32" },
          ],
        },
        { name: "unknownBoolean3", type: "boolean" },
      ],
    },
  ],
  [
    "AdminCommand.InteractionList",
    0x0a0900,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknownBoolean1", type: "boolean" },
        {
          name: "unknownArray1",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "unknownDword7", type: "uint32" },
          ],
        },
        { name: "unknownString1", type: "string" },
        { name: "unknownBoolean2", type: "boolean" },
        {
          name: "unknownArray2",
          type: "array",
          fields: [
            { name: "unknownString1", type: "uint32" },
            { name: "unknownFloat2", type: "uint32" },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "unknownDword7", type: "uint32" },
          ],
        },
        { name: "unknownBoolean3", type: "boolean" },
      ],
    },
  ],
  [
    "Command.InteractionSelect",
    0x090a00,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "interactionId", type: "uint32" },
      ],
    },
  ],
  [
    "AdminCommand.InteractionSelect",
    0x0a0a00,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "interactionId", type: "uint32" },
      ],
    },
  ],
  ["Command.InteractionStartWheel", 0x090b00, {}],
  ["AdminCommand.InteractionStartWheel", 0x0a0b00, {}],
  ["Command.StartFlashGame", 0x090c00, {}],
  ["AdminCommand.StartFlashGame", 0x0a0c00, {}],
  [
    "Command.SetProfile",
    0x090d00,
    {
      fields: [
        { name: "profileId", type: "uint32" },
        { name: "tab", type: "uint32" },
      ],
    },
  ],
  [
    "AdminCommand.SetProfile",
    0x0a0d00,
    {
      fields: [
        { name: "profileId", type: "uint32" },
        { name: "tab", type: "uint32" },
      ],
    },
  ],
  ["Command.AddFriendRequest", 0x090e00, {}],
  ["AdminCommand.AddFriendRequest", 0x0a0e00, {}],
  ["Command.RemoveFriendRequest", 0x090f00, {}],
  ["AdminCommand.RemoveFriendRequest", 0x0a0f00, {}],
  ["Command.ConfirmFriendRequest", 0x091000, {}],
  ["AdminCommand.ConfirmFriendRequest", 0x0a1000, {}],
  ["Command.ConfirmFriendResponse", 0x091100, {}],
  ["AdminCommand.ConfirmFriendResponse", 0x0a1100, {}],
  ["Command.SetChatBubbleColor", 0x091200, {}],
  ["AdminCommand.SetChatBubbleColor", 0x0a1200, {}],
  [
    "Command.PlayerSelect",
    0x091300,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "guid", type: "uint64" },
      ],
    },
  ],
  [
    "AdminCommand.PlayerSelect",
    0x0a1300,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "guid", type: "uint64" },
      ],
    },
  ],
  [
    "Command.FreeInteractionNpc",
    0x091400,
    {
      fields: [],
    },
  ],
  [
    "AdminCommand.FreeInteractionNpc",
    0x0a1400,
    {
      fields: [],
    },
  ],
  ["Command.FriendsPositionRequest", 0x091500, {}],
  ["AdminCommand.FriendsPositionRequest", 0x0a1500, {}],
  ["Command.MoveAndInteract", 0x091600, {}],
  ["AdminCommand.MoveAndInteract", 0x0a1600, {}],
  ["Command.QuestAbandon", 0x091700, {}],
  ["AdminCommand.QuestAbandon", 0x0a1700, {}],
  ["Command.RecipeStart", 0x091800, {}],
  ["AdminCommand.RecipeStart", 0x0a1800, {}],
  ["Command.ShowRecipeWindow", 0x091900, {}],
  ["AdminCommand.ShowRecipeWindow", 0x0a1900, {}],
  ["Command.ActivateProfileFailed", 0x091a00, {}],
  ["AdminCommand.ActivateProfileFailed", 0x0a1a00, {}],
  ["Command.PlayDialogEffect", 0x091b00, {}],
  ["AdminCommand.PlayDialogEffect", 0x0a1b00, {}],
  ["Command.ForceClearDialog", 0x091c00, {}],
  ["AdminCommand.ForceClearDialog", 0x0a1c00, {}],
  ["Command.IgnoreRequest", 0x091d00, {}],
  ["AdminCommand.IgnoreRequest", 0x0a1d00, {}],
  ["Command.SetActiveVehicleGuid", 0x091e00, {}],
  ["AdminCommand.SetActiveVehicleGuid", 0x0a1e00, {}],
  ["Command.ChatChannelOn", 0x091f00, {}],
  ["AdminCommand.ChatChannelOn", 0x0a1f00, {}],
  ["Command.ChatChannelOff", 0x092000, {}],
  ["AdminCommand.ChatChannelOff", 0x0a2000, {}],
  ["Command.RequestPlayerPositions", 0x092100, {}],
  ["AdminCommand.RequestPlayerPositions", 0x0a2100, {}],
  ["Command.RequestPlayerPositionsReply", 0x092200, {}],
  ["AdminCommand.RequestPlayerPositionsReply", 0x0a2200, {}],
  ["Command.SetProfileByItemDefinitionId", 0x092300, {}],
  ["AdminCommand.SetProfileByItemDefinitionId", 0x0a2300, {}],
  ["Command.RequestRewardPreviewUpdate", 0x092400, {}],
  ["AdminCommand.RequestRewardPreviewUpdate", 0x0a2400, {}],
  ["Command.RequestRewardPreviewUpdateReply", 0x092500, {}],
  ["AdminCommand.RequestRewardPreviewUpdateReply", 0x0a2500, {}],
  ["Command.PlaySoundIdOnTarget", 0x092600, {}],
  ["AdminCommand.PlaySoundIdOnTarget", 0x0a2600, {}],
  ["Command.RequestPlayIntroEncounter", 0x092700, {}],
  ["AdminCommand.RequestPlayIntroEncounter", 0x0a2700, {}],
  ["Command.SpotPlayer", 0x092800, {}],
  ["AdminCommand.SpotPlayer", 0x0a2800, {}],
  ["Command.SpotPlayerReply", 0x092900, {}],
  ["AdminCommand.SpotPlayerReply", 0x0a2900, {}],
  ["Command.SpotPrimaryTarget", 0x092a00, {}],
  ["AdminCommand.SpotPrimaryTarget", 0x0a2a00, {}],
  [
    "Command.InteractionString",
    0x092b00,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "stringId", type: "uint32" },
        { name: "unknown4", type: "uint32" },
      ],
    },
  ],
  [
    "AdminCommand.InteractionString",
    0x0a2b00,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "stringId", type: "uint32" },
        { name: "unknown4", type: "uint32" },
      ],
    },
  ],
  ["Command.GiveCurrency", 0x092c00, {}],
  ["AdminCommand.GiveCurrency", 0x0a2c00, {}],
  ["Command.HoldBreath", 0x092d00, {}],
  ["AdminCommand.HoldBreath", 0x0a2d00, {}],
  ["Command.ChargeCollision", 0x092e00, {}],
  ["AdminCommand.ChargeCollision", 0x0a2e00, {}],
  ["Command.DebrisLaunch", 0x092f00, {}],
  ["AdminCommand.DebrisLaunch", 0x0a2f00, {}],
  ["Command.Suicide", 0x093000, {}],
  ["AdminCommand.Suicide", 0x0a3000, {}],
  ["Command.RequestHelp", 0x093100, {}],
  ["AdminCommand.RequestHelp", 0x0a3100, {}],
  ["Command.OfferHelp", 0x093200, {}],
  ["AdminCommand.OfferHelp", 0x0a3200, {}],
  ["Command.Redeploy", 0x093300, {}],
  ["AdminCommand.Redeploy", 0x0a3300, {}],
  ["Command.PlayersInRadius", 0x093400, {}],
  ["AdminCommand.PlayersInRadius", 0x0a3400, {}],
  ["Command.AFK", 0x093500, {}],
  ["AdminCommand.AFK", 0x0a3500, {}],
  ["Command.ReportPlayerReply", 0x093600, {}],
  ["AdminCommand.ReportPlayerReply", 0x0a3600, {}],
  ["Command.ReportPlayerCheckNameRequest", 0x093700, {}],
  ["AdminCommand.ReportPlayerCheckNameRequest", 0x0a3700, {}],
  ["Command.ReportPlayerCheckNameReply", 0x093800, {}],
  ["AdminCommand.ReportPlayerCheckNameReply", 0x0a3800, {}],
  ["Command.ReportRendererDump", 0x093900, {}],
  ["AdminCommand.ReportRendererDump", 0x0a3900, {}],
  ["Command.ChangeName", 0x093a00, {}],
  ["AdminCommand.ChangeName", 0x0a3a00, {}],
  ["Command.NameValidation", 0x093b00, {}],
  ["AdminCommand.NameValidation", 0x0a3b00, {}],
  ["Command.PlayerFileDistribution", 0x093c00, {}],
  ["AdminCommand.PlayerFileDistribution", 0x0a3c00, {}],
  ["Command.ZoneFileDistribution", 0x093d00, {}],
  ["AdminCommand.ZoneFileDistribution", 0x0a3d00, {}],
  [
    "Command.AddWorldCommand",
    0x093e00,
    {
      fields: [{ name: "command", type: "string" }],
    },
  ],
  [
    "AdminCommand.AddWorldCommand",
    0x0a3e00,
    {
      fields: [{ name: "command", type: "string" }],
    },
  ],
  [
    "Command.AddZoneCommand",
    0x093f00,
    {
      fields: [{ name: "command", type: "string" }],
    },
  ],
  [
    "AdminCommand.AddZoneCommand",
    0x0a3f00,
    {
      fields: [{ name: "command", type: "string" }],
    },
  ],
  [
    "Command.ExecuteCommand",
    0x094000,
    {
      fields: [
        { name: "commandHash", type: "uint32" },
        { name: "arguments", type: "string" },
      ],
    },
  ],
  [
    "AdminCommand.ExecuteCommand",
    0x0a4000,
    {
      fields: [
        { name: "commandHash", type: "uint32" },
        { name: "arguments", type: "string" },
      ],
    },
  ],
  [
    "Command.ZoneExecuteCommand",
    0x094100,
    {
      fields: [
        { name: "commandHash", type: "uint32" },
        { name: "arguments", type: "string" },
      ],
    },
  ],
  [
    "AdminCommand.ZoneExecuteCommand",
    0x0a4100,
    {
      fields: [
        { name: "commandHash", type: "uint32" },
        { name: "arguments", type: "string" },
      ],
    },
  ],
  ["Command.RequestStripEffect", 0x094200, {}],
  ["AdminCommand.RequestStripEffect", 0x0a4200, {}],
  ["Command.ItemDefinitionRequest", 0x094300, {}],
  ["AdminCommand.ItemDefinitionRequest", 0x0a4300, {}],
  ["Command.ItemDefinitionReply", 0x094400, {}],
  ["AdminCommand.ItemDefinitionReply", 0x0a4400, {}],
  ["Command.ItemDefinitions", 0x094500, {}],
  ["AdminCommand.ItemDefinitions", 0x0a4500, {}],
  [
    "Command.EnableCompositeEffects",
    0x094600,
    {
      fields: [{ name: "enabled", type: "boolean" }],
    },
  ],
  [
    "AdminCommand.EnableCompositeEffects",
    0x0a4600,
    {
      fields: [{ name: "enabled", type: "boolean" }],
    },
  ],
  ["Command.StartRentalUpsell", 0x094700, {}],
  ["AdminCommand.StartRentalUpsell", 0x0a4700, {}],
  ["Command.SafeEject", 0x094800, {}],
  ["AdminCommand.SafeEject", 0x0a4800, {}],
  ["Command.ValidateDataForZoneOwnedTiles", 0x096c04, {}],
  ["AdminCommand.ValidateDataForZoneOwnedTiles", 0x0a6c04, {}],
  [
    "Command.RequestWeaponFireStateUpdate",
    0x094900,
    {
      fields: [{ name: "characterId", type: "uint64" }],
    },
  ],
  [
    "AdminCommand.RequestWeaponFireStateUpdate",
    0x0a4900,
    {
      fields: [{ name: "characterId", type: "uint64" }],
    },
  ],
  ["Command.SetInWater", 0x094a00, {}],
  ["AdminCommand.SetInWater", 0x0a4a00, {}],
  ["Command.ClearInWater", 0x094b00, {}],
  ["AdminCommand.ClearInWater", 0x0a4b00, {}],
  ["Command.StartLogoutRequest", 0x094c00, {}],
  ["AdminCommand.StartLogoutRequest", 0x0a4c00, {}],
  ["Command.Delivery", 0x094d00, {}],
  ["AdminCommand.Delivery", 0x0a4d00, {}],
  ["Command.DeliveryDisplayInfo", 0x094e00, {}],
  ["AdminCommand.DeliveryDisplayInfo", 0x0a4e00, {}],
  ["Command.DeliveryManagerStatus", 0x094f00, {}],
  ["AdminCommand.DeliveryManagerStatus", 0x0a4f00, {}],
  ["Command.DeliveryManagerShowNotification", 0x095000, {}],
  ["AdminCommand.DeliveryManagerShowNotification", 0x0a5000, {}],
  ["Command.AddItem", 0x09ea03, {}],
  ["AdminCommand.AddItem", 0x0aea03, {}],
  ["Command.DeleteItem", 0x09eb03, {}],
  ["AdminCommand.DeleteItem", 0x0aeb03, {}],
  ["Command.AbilityReply", 0x09ec03, {}],
  ["AdminCommand.AbilityReply", 0x0aec03, {}],
  ["Command.AbilityList", 0x09ed03, {}],
  ["AdminCommand.AbilityList", 0x0aed03, {}],
  ["Command.AbilityAdd", 0x09ee03, {}],
  ["AdminCommand.AbilityAdd", 0x0aee03, {}],
  ["Command.ServerInformation", 0x09ef03, {}],
  ["AdminCommand.ServerInformation", 0x0aef03, {}],
  ["Command.SpawnNpcRequest", 0x09f003, {}],
  ["AdminCommand.SpawnNpcRequest", 0x0af003, {}],
  ["Command.NpcSpawn", 0x09f103, {}],
  ["AdminCommand.NpcSpawn", 0x0af103, {}],
  ["Command.NpcList", 0x09f203, {}],
  ["AdminCommand.NpcList", 0x0af203, {}],
  ["Command.NpcDisableSpawners", 0x09f303, {}],
  ["AdminCommand.NpcDisableSpawners", 0x0af303, {}],
  ["Command.NpcDespawn", 0x09f403, {}],
  ["AdminCommand.NpcDespawn", 0x0af403, {}],
  ["Command.NpcCreateSpawn", 0x09f503, {}],
  ["AdminCommand.NpcCreateSpawn", 0x0af503, {}],
  ["Command.NpcInfoRequest", 0x09f603, {}],
  ["AdminCommand.NpcInfoRequest", 0x0af603, {}],
  ["Command.ZonePacketLogging", 0x09f703, {}],
  ["AdminCommand.ZonePacketLogging", 0x0af703, {}],
  ["Command.ZoneListRequest", 0x09f803, {}],
  ["AdminCommand.ZoneListRequest", 0x0af803, {}],
  ["Command.ZoneListReply", 0x09f903, {}],
  ["AdminCommand.ZoneListReply", 0x0af903, {}],
  ["Command.TeleportToLocation", 0x09fa03, {}],
  ["AdminCommand.TeleportToLocation", 0x0afa03, {}],
  ["Command.TeleportToLocationEx", 0x09fb03, {}],
  ["AdminCommand.TeleportToLocationEx", 0x0afb03, {}],
  ["Command.TeleportManagedToLocation", 0x09fc03, {}],
  ["AdminCommand.TeleportManagedToLocation", 0x0afc03, {}],
  ["Command.CollectionStart", 0x09fd03, {}],
  ["AdminCommand.CollectionStart", 0x0afd03, {}],
  ["Command.CollectionClear", 0x09fe03, {}],
  ["AdminCommand.CollectionClear", 0x0afe03, {}],
  ["Command.CollectionRemove", 0x09ff03, {}],
  ["AdminCommand.CollectionRemove", 0x0aff03, {}],
  ["Command.CollectionAddEntry", 0x090004, {}],
  ["AdminCommand.CollectionAddEntry", 0x0a0004, {}],
  ["Command.CollectionRemoveEntry", 0x090104, {}],
  ["AdminCommand.CollectionRemoveEntry", 0x0a0104, {}],
  ["Command.CollectionRefresh", 0x090204, {}],
  ["AdminCommand.CollectionRefresh", 0x0a0204, {}],
  ["Command.CollectionFill", 0x090304, {}],
  ["AdminCommand.CollectionFill", 0x0a0304, {}],
  ["Command.ReloadData", 0x090404, {}],
  ["AdminCommand.ReloadData", 0x0a0404, {}],
  ["Command.OnlineStatusRequest", 0x090504, {}],
  ["AdminCommand.OnlineStatusRequest", 0x0a0504, {}],
  ["Command.OnlineStatusReply", 0x090604, {}],
  ["AdminCommand.OnlineStatusReply", 0x0a0604, {}],
  ["Command.MovePlayerToWorldLocation", 0x090704, {}],
  ["AdminCommand.MovePlayerToWorldLocation", 0x0a0704, {}],
  ["Command.MovePlayerToTargetPlayer", 0x090804, {}],
  ["AdminCommand.MovePlayerToTargetPlayer", 0x0a0804, {}],
  ["Command.LaunchAbilityId", 0x090904, {}],
  ["AdminCommand.LaunchAbilityId", 0x0a0904, {}],
  ["Command.Kill", 0x090a04, {}],
  ["AdminCommand.Kill", 0x0a0a04, {}],
  ["Command.FindEnemy", 0x090b04, {}],
  ["AdminCommand.FindEnemy", 0x0a0b04, {}],
  ["Command.FindEnemyReply", 0x090c04, {}],
  ["AdminCommand.FindEnemyReply", 0x0a0c04, {}],
  ["Command.FollowPlayer", 0x090d04, {}],
  ["AdminCommand.FollowPlayer", 0x0a0d04, {}],
  ["Command.SetClientDebugFlag", 0x090e04, {}],
  ["AdminCommand.SetClientDebugFlag", 0x0a0e04, {}],
  ["Command.RunZoneScript", 0x090f04, {}],
  ["AdminCommand.RunZoneScript", 0x0a0f04, {}],
  ["Command.RequestAggroDist", 0x091004, {}],
  ["AdminCommand.RequestAggroDist", 0x0a1004, {}],
  ["Command.AggroDist", 0x091104, {}],
  ["AdminCommand.AggroDist", 0x0a1104, {}],
  ["Command.TestRequirement", 0x091204, {}],
  ["AdminCommand.TestRequirement", 0x0a1204, {}],
  ["Command.UITest", 0x091304, {}],
  ["AdminCommand.UITest", 0x0a1304, {}],
  ["Command.EncounterComplete", 0x091404, {}],
  ["AdminCommand.EncounterComplete", 0x0a1404, {}],
  ["Command.AddRewardBonus", 0x091504, {}],
  ["AdminCommand.AddRewardBonus", 0x0a1504, {}],
  ["Command.SetClientBehaviorFlag", 0x091604, {}],
  ["AdminCommand.SetClientBehaviorFlag", 0x0a1604, {}],
  ["Command.SetVipRank", 0x091704, {}],
  ["AdminCommand.SetVipRank", 0x0a1704, {}],
  ["Command.ToggleDebugNpc", 0x091804, {}],
  ["AdminCommand.ToggleDebugNpc", 0x0a1804, {}],
  ["Command.QuestStart", 0x091904, {}],
  ["AdminCommand.QuestStart", 0x0a1904, {}],
  ["Command.SummonRequest", 0x091a04, {}],
  ["AdminCommand.SummonRequest", 0x0a1a04, {}],
  ["Command.QuestList", 0x091b04, {}],
  ["AdminCommand.QuestList", 0x0a1b04, {}],
  ["Command.EncounterStart", 0x091c04, {}],
  ["AdminCommand.EncounterStart", 0x0a1c04, {}],
  ["Command.RewardSetGive", 0x091d04, {}],
  ["AdminCommand.RewardSetGive", 0x0a1d04, {}],
  ["Command.RewardSetList", 0x091e04, {}],
  ["AdminCommand.RewardSetList", 0x0a1e04, {}],
  ["Command.RewardSetFind", 0x091f04, {}],
  ["AdminCommand.RewardSetFind", 0x0a1f04, {}],
  ["Command.QuestComplete", 0x092004, {}],
  ["AdminCommand.QuestComplete", 0x0a2004, {}],
  ["Command.QuestStatus", 0x092104, {}],
  ["AdminCommand.QuestStatus", 0x0a2104, {}],
  ["Command.CoinsSet", 0x092204, {}],
  ["AdminCommand.CoinsSet", 0x0a2204, {}],
  ["Command.CoinsAdd", 0x092304, {}],
  ["AdminCommand.CoinsAdd", 0x0a2304, {}],
  ["Command.CoinsGet", 0x092404, {}],
  ["AdminCommand.CoinsGet", 0x0a2404, {}],
  ["Command.AddCurrency", 0x092504, {}],
  ["AdminCommand.AddCurrency", 0x0a2504, {}],
  ["Command.SetCurrency", 0x092604, {}],
  ["AdminCommand.SetCurrency", 0x0a2604, {}],
  ["Command.ClearCurrency", 0x092704, {}],
  ["AdminCommand.ClearCurrency", 0x0a2704, {}],
  ["Command.RewardCurrency", 0x092804, {}],
  ["AdminCommand.RewardCurrency", 0x0a2804, {}],
  ["Command.ListCurrencyRequest", 0x092904, {}],
  ["AdminCommand.ListCurrencyRequest", 0x0a2904, {}],
  ["Command.ListCurrencyReply", 0x092a04, {}],
  ["AdminCommand.ListCurrencyReply", 0x0a2a04, {}],
  ["Command.RewardSetGiveRadius", 0x092b04, {}],
  ["AdminCommand.RewardSetGiveRadius", 0x0a2b04, {}],
  ["Command.InGamePurchaseRequest", 0x092c04, {}],
  ["AdminCommand.InGamePurchaseRequest", 0x0a2c04, {}],
  ["Command.InGamePurchaseReply", 0x092d04, {}],
  ["AdminCommand.InGamePurchaseReply", 0x0a2d04, {}],
  ["Command.TestNpcRelevance", 0x092e04, {}],
  ["AdminCommand.TestNpcRelevance", 0x0a2e04, {}],
  ["Command.GameTime", 0x092f04, {}],
  ["AdminCommand.GameTime", 0x0a2f04, {}],
  ["Command.ClientTime", 0x093004, {}],
  ["AdminCommand.ClientTime", 0x0a3004, {}],
  ["Command.QuestObjectiveComplete", 0x093104, {}],
  ["AdminCommand.QuestObjectiveComplete", 0x0a3104, {}],
  ["Command.QuestObjectiveIncrement", 0x093204, {}],
  ["AdminCommand.QuestObjectiveIncrement", 0x0a3204, {}],
  ["Command.EncounterStatus", 0x093304, {}],
  ["AdminCommand.EncounterStatus", 0x0a3304, {}],
  ["Command.GotoRequest", 0x093404, {}],
  ["AdminCommand.GotoRequest", 0x0a3404, {}],
  ["Command.GotoReply", 0x093504, {}],
  ["AdminCommand.GotoReply", 0x0a3504, {}],
  ["Command.GotoWapointRequest", 0x093604, {}],
  ["AdminCommand.GotoWapointRequest", 0x0a3604, {}],
  ["Command.ServerVersion", 0x093704, {}],
  ["AdminCommand.ServerVersion", 0x0a3704, {}],
  ["Command.ServerUptime", 0x093804, {}],
  ["AdminCommand.ServerUptime", 0x0a3804, {}],
  ["Command.DeleteItemById", 0x093904, {}],
  ["AdminCommand.DeleteItemById", 0x0a3904, {}],
  ["Command.GetItemList", 0x093a04, {}],
  ["AdminCommand.GetItemList", 0x0a3a04, {}],
  ["Command.GetItemListReply", 0x093b04, {}],
  ["AdminCommand.GetItemListReply", 0x0a3b04, {}],
  ["Command.QuestHistory", 0x093c04, {}],
  ["AdminCommand.QuestHistory", 0x0a3c04, {}],
  ["Command.QuestHistoryClear", 0x093d04, {}],
  ["AdminCommand.QuestHistoryClear", 0x0a3d04, {}],
  ["Command.TradeStatus", 0x093e04, {}],
  ["AdminCommand.TradeStatus", 0x0a3e04, {}],
  ["Command.PathDataRequest", 0x093f04, {}],
  ["AdminCommand.PathDataRequest", 0x0a3f04, {}],
  ["Command.SummonReply", 0x094004, {}],
  ["AdminCommand.SummonReply", 0x0a4004, {}],
  ["Command.Broadcast", 0x094104, {}],
  ["AdminCommand.Broadcast", 0x0a4104, {}],
  ["Command.BroadcastZone", 0x094204, {}],
  ["AdminCommand.BroadcastZone", 0x0a4204, {}],
  ["Command.BroadcastWorld", 0x094304, {}],
  ["AdminCommand.BroadcastWorld", 0x0a4304, {}],
  ["Command.ListPets", 0x094404, {}],
  ["AdminCommand.ListPets", 0x0a4404, {}],
  ["Command.PetSetUtility", 0x094504, {}],
  ["AdminCommand.PetSetUtility", 0x0a4504, {}],
  ["Command.PetTrick", 0x094604, {}],
  ["AdminCommand.PetTrick", 0x0a4604, {}],
  ["Command.RecipeAction", 0x094704, {}],
  ["AdminCommand.RecipeAction", 0x0a4704, {}],
  ["Command.WorldKick", 0x094804, {}],
  ["AdminCommand.WorldKick", 0x0a4804, {}],
  ["Command.EncounterRunTimerDisable", 0x094904, {}],
  ["AdminCommand.EncounterRunTimerDisable", 0x0a4904, {}],
  ["Command.ReloadPermissions", 0x094a04, {}],
  ["AdminCommand.ReloadPermissions", 0x0a4a04, {}],
  ["Command.CharacterFlags", 0x094b04, {}],
  ["AdminCommand.CharacterFlags", 0x0a4b04, {}],
  ["Command.SetEncounterPartySizeOverride", 0x094c04, {}],
  ["AdminCommand.SetEncounterPartySizeOverride", 0x0a4c04, {}],
  ["Command.BuildTime", 0x094d04, {}],
  ["AdminCommand.BuildTime", 0x0a4d04, {}],
  ["Command.SelectiveSpawnEnable", 0x094e04, {}],
  ["AdminCommand.SelectiveSpawnEnable", 0x0a4e04, {}],
  ["Command.SelectiveSpawnAdd", 0x094f04, {}],
  ["AdminCommand.SelectiveSpawnAdd", 0x0a4f04, {}],
  ["Command.SelectiveSpawnAddById", 0x095004, {}],
  ["AdminCommand.SelectiveSpawnAddById", 0x0a5004, {}],
  ["Command.SelectiveSpawnClear", 0x095104, {}],
  ["AdminCommand.SelectiveSpawnClear", 0x0a5104, {}],
  ["Command.BecomeEnforcer", 0x095204, {}],
  ["AdminCommand.BecomeEnforcer", 0x0a5204, {}],
  ["Command.BecomeReferee", 0x095304, {}],
  ["AdminCommand.BecomeReferee", 0x0a5304, {}],
  ["Command.Profiler", 0x095404, {}],
  ["AdminCommand.Profiler", 0x0a5404, {}],
  ["Command.WorldKickPending", 0x095504, {}],
  ["AdminCommand.WorldKickPending", 0x0a5504, {}],
  ["Command.ActivateMembership", 0x095604, {}],
  ["AdminCommand.ActivateMembership", 0x0a5604, {}],
  ["Command.JoinLobby", 0x095704, {}],
  ["AdminCommand.JoinLobby", 0x0a5704, {}],
  ["Command.LeaveLobby", 0x095804, {}],
  ["AdminCommand.LeaveLobby", 0x0a5804, {}],
  ["Command.SetMOTD", 0x095904, {}],
  ["AdminCommand.SetMOTD", 0x0a5904, {}],
  ["Command.Snoop", 0x095a04, {}],
  ["AdminCommand.Snoop", 0x0a5a04, {}],
  ["Command.JoinScheduledActivityRequest", 0x095b04, {}],
  ["AdminCommand.JoinScheduledActivityRequest", 0x0a5b04, {}],
  ["Command.JoinScheduledActivityReply", 0x095c04, {}],
  ["AdminCommand.JoinScheduledActivityReply", 0x0a5c04, {}],
  ["Command.BecomeAmbassador", 0x095d04, {}],
  ["AdminCommand.BecomeAmbassador", 0x0a5d04, {}],
  ["Command.CollectionsShow", 0x095e04, {}],
  ["AdminCommand.CollectionsShow", 0x0a5e04, {}],
  ["Command.GetZoneDrawData", 0x095f04, {}],
  ["AdminCommand.GetZoneDrawData", 0x0a5f04, {}],
  ["Command.ZoneDrawData", 0x096004, {}],
  ["AdminCommand.ZoneDrawData", 0x0a6004, {}],
  ["Command.QuestAbandon", 0x096104, {}],
  ["AdminCommand.QuestAbandon", 0x0a6104, {}],
  ["Command.SetVehicleDefault", 0x096204, {}],
  ["AdminCommand.SetVehicleDefault", 0x0a6204, {}],
  ["Command.Freeze", 0x096304, {}],
  ["AdminCommand.Freeze", 0x0a6304, {}],
  ["Command.ObjectiveAction", 0x096404, {}],
  ["AdminCommand.ObjectiveAction", 0x0a6404, {}],
  ["Command.EquipAdd", 0x096504, {}],
  ["AdminCommand.EquipAdd", 0x0a6504, {}],
  ["Command.Info", 0x096604, {}],
  ["AdminCommand.Info", 0x0a6604, {}],
  ["Command.Silence", 0x096704, {}],
  ["AdminCommand.Silence", 0x0a6704, {}],
  ["Command.SpawnerStatus", 0x096804, {}],
  ["AdminCommand.SpawnerStatus", 0x0a6804, {}],
  ["Command.Behavior", 0x096904, {}],
  ["AdminCommand.Behavior", 0x0a6904, {}],
  ["Command.DebugFirstTimeEvents", 0x096a04, {}],
  ["AdminCommand.DebugFirstTimeEvents", 0x0a6a04, {}],
  ["Command.SetWorldWebEventAggregationPeriod", 0x096b04, {}],
  ["AdminCommand.SetWorldWebEventAggregationPeriod", 0x0a6b04, {}],
  ["Command.GivePet", 0x096d04, {}],
  ["AdminCommand.GivePet", 0x0a6d04, {}],
  ["Command.NpcLocationRequest", 0x096e04, {}],
  ["AdminCommand.NpcLocationRequest", 0x0a6e04, {}],
  ["Command.BroadcastUniverse", 0x096f04, {}],
  ["AdminCommand.BroadcastUniverse", 0x0a6f04, {}],
  ["Command.TrackedEventLogToFile", 0x097004, {}],
  ["AdminCommand.TrackedEventLogToFile", 0x0a7004, {}],
  ["Command.TrackedEventEnable", 0x097104, {}],
  ["AdminCommand.TrackedEventEnable", 0x0a7104, {}],
  ["Command.TrackedEventEnableAll", 0x097204, {}],
  ["AdminCommand.TrackedEventEnableAll", 0x0a7204, {}],
  ["Command.Event", 0x097304, {}],
  ["AdminCommand.Event", 0x0a7304, {}],
  ["Command.PerformAction", 0x097404, {}],
  ["AdminCommand.PerformAction", 0x0a7404, {}],
  ["Command.CountrySet", 0x097504, {}],
  ["AdminCommand.CountrySet", 0x0a7504, {}],
  ["Command.TrackedEventReloadConfig", 0x097604, {}],
  ["AdminCommand.TrackedEventReloadConfig", 0x0a7604, {}],
  ["Command.SummonNPC", 0x097704, {}],
  ["AdminCommand.SummonNPC", 0x0a7704, {}],
  ["Command.AchievementComplete", 0x097804, {}],
  ["AdminCommand.AchievementComplete", 0x0a7804, {}],
  ["Command.AchievementList", 0x097904, {}],
  ["AdminCommand.AchievementList", 0x0a7904, {}],
  ["Command.AchievementStatus", 0x097a04, {}],
  ["AdminCommand.AchievementStatus", 0x0a7a04, {}],
  ["Command.AchievementObjectiveComplete", 0x097b04, {}],
  ["AdminCommand.AchievementObjectiveComplete", 0x0a7b04, {}],
  ["Command.AchievementObjectiveIncrement", 0x097c04, {}],
  ["AdminCommand.AchievementObjectiveIncrement", 0x0a7c04, {}],
  ["Command.AchievementEnable", 0x097d04, {}],
  ["AdminCommand.AchievementEnable", 0x0a7d04, {}],
  ["Command.AchievementReset", 0x097e04, {}],
  ["AdminCommand.AchievementReset", 0x0a7e04, {}],
  ["Command.SetAffiliate", 0x097f04, {}],
  ["AdminCommand.SetAffiliate", 0x0a7f04, {}],
  ["Command.HousingInstanceEdit", 0x098004, {}],
  ["AdminCommand.HousingInstanceEdit", 0x0a8004, {}],
  ["Command.WorldRequest", 0x098104, {}],
  ["AdminCommand.WorldRequest", 0x0a8104, {}],
  ["Command.EnableNpcRelevanceBypass", 0x098204, {}],
  ["AdminCommand.EnableNpcRelevanceBypass", 0x0a8204, {}],
  ["Command.GrantPromotionalBundle", 0x098304, {}],
  ["AdminCommand.GrantPromotionalBundle", 0x0a8304, {}],
  ["Command.ResetItemCooldowns", 0x098404, {}],
  ["AdminCommand.ResetItemCooldowns", 0x0a8404, {}],
  ["Command.MountAdd", 0x098504, {}],
  ["AdminCommand.MountAdd", 0x0a8504, {}],
  ["Command.MountDelete", 0x098604, {}],
  ["AdminCommand.MountDelete", 0x0a8604, {}],
  ["Command.MountList", 0x098704, {}],
  ["AdminCommand.MountList", 0x0a8704, {}],
  ["Command.GetItemInfo", 0x098804, {}],
  ["AdminCommand.GetItemInfo", 0x0a8804, {}],
  ["Command.RequestZoneComprehensiveDataDump", 0x098904, {}],
  ["AdminCommand.RequestZoneComprehensiveDataDump", 0x0a8904, {}],
  ["Command.RequestZoneComprehensiveDataDumpReply", 0x098a04, {}],
  ["AdminCommand.RequestZoneComprehensiveDataDumpReply", 0x0a8a04, {}],
  ["Command.NpcDamage", 0x098b04, {}],
  ["AdminCommand.NpcDamage", 0x0a8b04, {}],
  ["Command.HousingAddTrophy", 0x098c04, {}],
  ["AdminCommand.HousingAddTrophy", 0x0a8c04, {}],
  ["Command.TargetOfTarget", 0x098d04, {}],
  ["AdminCommand.TargetOfTarget", 0x0a8d04, {}],
  ["Command.AddAbilityEntry", 0x098e04, {}],
  ["AdminCommand.AddAbilityEntry", 0x0a8e04, {}],
  ["Command.RemoveAbilityEntry", 0x098f04, {}],
  ["AdminCommand.RemoveAbilityEntry", 0x0a8f04, {}],
  ["Command.PhaseList", 0x099004, {}],
  ["AdminCommand.PhaseList", 0x0a9004, {}],
  ["Command.PhaseAdd", 0x099104, {}],
  ["AdminCommand.PhaseAdd", 0x0a9104, {}],
  ["Command.PhaseRemove", 0x099204, {}],
  ["AdminCommand.PhaseRemove", 0x0a9204, {}],
  ["Command.AdventureAdd", 0x099304, {}],
  ["AdminCommand.AdventureAdd", 0x0a9304, {}],
  ["Command.AdventureSetPhase", 0x099404, {}],
  ["AdminCommand.AdventureSetPhase", 0x0a9404, {}],
  ["Command.SetFactionId", 0x099504, {}],
  ["AdminCommand.SetFactionId", 0x0a9504, {}],
  ["Command.FacilitySpawnSetCollisionState", 0x099604, {}],
  ["AdminCommand.FacilitySpawnSetCollisionState", 0x0a9604, {}],
  ["Command.SkillBase", 0x099704, {}],
  ["AdminCommand.SkillBase", 0x0a9704, {}],
  ["Command.VehicleBase", 0x099804, {}],
  ["AdminCommand.VehicleBase", 0x0a9804, {}],
  [
    "Command.SpawnVehicle",
    0x099904,
    {
      fields: [
        { name: "vehicleId", type: "uint32" },
        { name: "factionId", type: "uint8" },
        { name: "position", type: "floatvector3" },
        { name: "heading", type: "float" },
        { name: "unknownDword1", type: "uint32" },
        { name: "autoMount", type: "boolean" },
      ],
    },
  ],
  [
    "AdminCommand.SpawnVehicle",
    0x0a9904,
    {
      fields: [
        { name: "vehicleId", type: "uint32" },
        { name: "factionId", type: "uint8" },
        { name: "position", type: "floatvector3" },
        { name: "heading", type: "float" },
        { name: "unknownDword1", type: "uint32" },
        { name: "autoMount", type: "boolean" },
      ],
    },
  ],
  ["Command.SpawnVehicleReply", 0x099a04, {}],
  ["AdminCommand.SpawnVehicleReply", 0x0a9a04, {}],
  ["Command.DespawnVehicle", 0x099b04, {}],
  ["AdminCommand.DespawnVehicle", 0x0a9b04, {}],
  ["Command.WeaponStat", 0x099c04, {}],
  ["AdminCommand.WeaponStat", 0x0a9c04, {}],
  ["Command.GuildBase", 0x099d04, {}],
  ["AdminCommand.GuildBase", 0x0a9d04, {}],
  ["Command.VisualizePhysics", 0x099e04, {}],
  ["AdminCommand.VisualizePhysics", 0x0a9e04, {}],
  ["Command.PlayerHealthSetRequest", 0x099f04, {}],
  ["AdminCommand.PlayerHealthSetRequest", 0x0a9f04, {}],
  ["Command.PlayerForceRespawnRequest", 0x09a004, {}],
  ["AdminCommand.PlayerForceRespawnRequest", 0x0aa004, {}],
  ["Command.ResourceRequest", 0x09a104, {}],
  ["AdminCommand.ResourceRequest", 0x0aa104, {}],
  ["Command.ZoneDebugMessage", 0x09a204, {}],
  ["AdminCommand.ZoneDebugMessage", 0x0aa204, {}],
  ["Command.VerifyAdminTarget", 0x09a304, {}],
  ["AdminCommand.VerifyAdminTarget", 0x0aa304, {}],
  ["Command.SetAllZoneFacilitiesToFactionRequest", 0x09a404, {}],
  ["AdminCommand.SetAllZoneFacilitiesToFactionRequest", 0x0aa404, {}],
  ["Command.FacilityResetMapRequest", 0x09a504, {}],
  ["AdminCommand.FacilityResetMapRequest", 0x0aa504, {}],
  ["Command.DesignDataChanges", 0x09a604, {}],
  ["AdminCommand.DesignDataChanges", 0x0aa604, {}],
  ["Command.GiveXp", 0x09a704, {}],
  ["AdminCommand.GiveXp", 0x0aa704, {}],
  ["Command.GiveRank", 0x09a804, {}],
  ["AdminCommand.GiveRank", 0x0aa804, {}],
  ["Command.PlayerExperienceRequest", 0x09a904, {}],
  ["AdminCommand.PlayerExperienceRequest", 0x0aa904, {}],
  ["Command.Noclip", 0x09aa04, {}],
  ["AdminCommand.Noclip", 0x0aaa04, {}],
  ["Command.VerifyAdminPermission", 0x09ab04, {}],
  ["AdminCommand.VerifyAdminPermission", 0x0aab04, {}],
  ["Command.RegionRequest", 0x09ac04, {}],
  ["AdminCommand.RegionRequest", 0x0aac04, {}],
  ["Command.RegionReply", 0x09ad04, {}],
  ["AdminCommand.RegionReply", 0x0aad04, {}],
  ["Command.RegionRewardsReply", 0x09ae04, {}],
  ["AdminCommand.RegionRewardsReply", 0x0aae04, {}],
  ["Command.RegionFactionRewardsReply", 0x09af04, {}],
  ["AdminCommand.RegionFactionRewardsReply", 0x0aaf04, {}],
  ["Command.FacilityListNpcReply", 0x09b004, {}],
  ["AdminCommand.FacilityListNpcReply", 0x0ab004, {}],
  ["Command.FacilityListReply", 0x09b104, {}],
  ["AdminCommand.FacilityListReply", 0x0ab104, {}],
  ["Command.PingServer", 0x09b204, {}],
  ["AdminCommand.PingServer", 0x0ab204, {}],
  ["Command.AnimDebug", 0x09b304, {}],
  ["AdminCommand.AnimDebug", 0x0ab304, {}],
  ["Command.RemoteClientAnimDebugRequest", 0x09b404, {}],
  ["AdminCommand.RemoteClientAnimDebugRequest", 0x0ab404, {}],
  ["Command.RemoteClientAnimDebugReply", 0x09b504, {}],
  ["AdminCommand.RemoteClientAnimDebugReply", 0x0ab504, {}],
  ["Command.RewardBuffManagerGiveReward", 0x09b604, {}],
  ["AdminCommand.RewardBuffManagerGiveReward", 0x0ab604, {}],
  ["Command.RewardBuffManagerAddPlayers", 0x09b704, {}],
  ["AdminCommand.RewardBuffManagerAddPlayers", 0x0ab704, {}],
  ["Command.RewardBuffManagerRemovePlayers", 0x09b804, {}],
  ["AdminCommand.RewardBuffManagerRemovePlayers", 0x0ab804, {}],
  ["Command.RewardBuffManagerClearAllPlayers", 0x09b904, {}],
  ["AdminCommand.RewardBuffManagerClearAllPlayers", 0x0ab904, {}],
  ["Command.RewardBuffManagerListAll", 0x09ba04, {}],
  ["AdminCommand.RewardBuffManagerListAll", 0x0aba04, {}],
  ["Command.QueryNpcRequest", 0x09bb04, {}],
  ["AdminCommand.QueryNpcRequest", 0x0abb04, {}],
  ["Command.QueryNpcReply", 0x09bc04, {}],
  ["AdminCommand.QueryNpcReply", 0x0abc04, {}],
  ["Command.ZonePlayerCount", 0x09bd04, {}],
  ["AdminCommand.ZonePlayerCount", 0x0abd04, {}],
  ["Command.GriefRequest", 0x09be04, {}],
  ["AdminCommand.GriefRequest", 0x0abe04, {}],
  ["Command.TeleportToObjectTag", 0x09bf04, {}],
  ["AdminCommand.TeleportToObjectTag", 0x0abf04, {}],
  ["Command.DamagePlayer", 0x09c004, {}],
  ["AdminCommand.DamagePlayer", 0x0ac004, {}],
  ["Command.HexPermissions", 0x09c104, {}],
  ["AdminCommand.HexPermissions", 0x0ac104, {}],
  ["Command.SpyRequest", 0x09c204, {}],
  ["AdminCommand.SpyRequest", 0x0ac204, {}],
  ["Command.SpyReply", 0x09c304, {}],
  ["AdminCommand.SpyReply", 0x0ac304, {}],
  ["Command.GatewayProfilerRegistration", 0x09c404, {}],
  ["AdminCommand.GatewayProfilerRegistration", 0x0ac404, {}],
  [
    "Command.RunSpeed",
    0x09c504,
    {
      fields: [{ name: "runSpeed", type: "float" }],
    },
  ],
  [
    "AdminCommand.RunSpeed",
    0x0ac504,
    {
      fields: [{ name: "runSpeed", type: "float" }],
    },
  ],
  ["Command.LocationRequest", 0x09c604, {}],
  ["AdminCommand.LocationRequest", 0x0ac604, {}],
  ["Command.GriefBase", 0x09c704, {}],
  ["AdminCommand.GriefBase", 0x0ac704, {}],
  ["Command.PlayerRenameRequest", 0x09c804, {}],
  ["AdminCommand.PlayerRenameRequest", 0x0ac804, {}],
  ["Command.EffectBase", 0x09c904, {}],
  ["AdminCommand.EffectBase", 0x0ac904, {}],
  ["Command.AbilityBase", 0x09ca04, {}],
  ["AdminCommand.AbilityBase", 0x0aca04, {}],
  ["Command.AcquireTimerBase", 0x09cb04, {}],
  ["AdminCommand.AcquireTimerBase", 0x0acb04, {}],
  ["Command.ReserveNameRequest", 0x09cc04, {}],
  ["AdminCommand.ReserveNameRequest", 0x0acc04, {}],
  ["Command.InternalConnectionBypass", 0x09cd04, {}],
  ["AdminCommand.InternalConnectionBypass", 0x0acd04, {}],
  ["Command.Queue", 0x09ce04, {}],
  ["AdminCommand.Queue", 0x0ace04, {}],
  ["Command.CharacterStatQuery", 0x09cf04, {}],
  ["AdminCommand.CharacterStatQuery", 0x0acf04, {}],
  ["Command.CharacterStatReply", 0x09d004, {}],
  ["AdminCommand.CharacterStatReply", 0x0ad004, {}],
  ["Command.LockStatusReply", 0x09d104, {}],
  ["AdminCommand.LockStatusReply", 0x0ad104, {}],
  ["Command.StatTracker", 0x09d204, {}],
  ["AdminCommand.StatTracker", 0x0ad204, {}],
  ["Command.ItemBase", 0x09d304, {}],
  ["AdminCommand.Items.ListAccountItems", 0x0ad30401, {}],
  ["AdminCommand.Items.ListItemRentalTerms", 0x0ad30402, {}],
  ["AdminCommand.Items.ListItemUseOptions", 0x0ad30403, {}],
  ["AdminCommand.Items.ListItemTimers", 0x0ad30404, {}],
  ["AdminCommand.Items.ExpireItemTrialTimers", 0x0ad30405, {}],
  ["AdminCommand.Items.ExpireItemRentalTimers", 0x0ad30406, {}],
  ["AdminCommand.Items.ClearItemTrialTimers", 0x0ad30407, {}],
  ["AdminCommand.Items.ClearItemRentalTimers", 0x0ad30408, {}],
  ["AdminCommand.Items.TestAddItem", 0x0ad30409, {}],
  ["AdminCommand.Items.AddAccountItem", 0x0ad3040a, {}],
  ["AdminCommand.Items.RemoveAccountItem", 0x0ad3040b, {}],
  ["AdminCommand.Items.ClearAccountItems", 0x0ad3040c, {}],
  ["AdminCommand.Items.ConvertAccountItem", 0x0ad3040d, {}],
  ["Command.CurrencyBase", 0x09d404, {}],
  ["AdminCommand.Currency.ListCurrencyDiscounts", 0x0ad40401, {}],
  ["AdminCommand.Currency.RequestSetCurrencyDiscount", 0x0ad40402, {}],
  ["Command.ImplantBase", 0x09d504, {}],
  ["AdminCommand.ImplantBase", 0x0ad504, {}],
  ["Command.FileDistribution", 0x09d604, {}],
  ["AdminCommand.FileDistribution", 0x0ad604, {}],
  ["Command.TopReports", 0x09d704, {}],
  ["AdminCommand.TopReports", 0x0ad704, {}],
  ["Command.ClearAllReports", 0x09d804, {}],
  ["AdminCommand.ClearAllReports", 0x0ad804, {}],
  ["Command.GetReport", 0x09d904, {}],
  ["AdminCommand.GetReport", 0x0ad904, {}],
  ["Command.DeleteReport", 0x09da04, {}],
  ["AdminCommand.DeleteReport", 0x0ada04, {}],
  ["Command.UserReports", 0x09db04, {}],
  ["AdminCommand.UserReports", 0x0adb04, {}],
  ["Command.ClearUserReports", 0x09dc04, {}],
  ["AdminCommand.ClearUserReports", 0x0adc04, {}],
  ["Command.WhoRequest", 0x09dd04, {}],
  ["AdminCommand.WhoRequest", 0x0add04, {}],
  ["Command.WhoReply", 0x09de04, {}],
  ["AdminCommand.WhoReply", 0x0ade04, {}],
  ["Command.FindRequest", 0x09df04, {}],
  ["AdminCommand.FindRequest", 0x0adf04, {}],
  ["Command.FindReply", 0x09e004, {}],
  ["AdminCommand.FindReply", 0x0ae004, {}],
  ["Command.CaisBase", 0x09e104, {}],
  ["AdminCommand.CaisBase", 0x0ae104, {}],
  ["Command.MyRealtimeGatewayMovement", 0x09e204, {}],
  ["AdminCommand.MyRealtimeGatewayMovement", 0x0ae204, {}],
  ["Command.ObserverCam", 0x09e304, {}],
  ["AdminCommand.ObserverCam", 0x0ae304, {}],
  ["Command.AddItemContentPack", 0x09e404, {}],
  ["AdminCommand.AddItemContentPack", 0x0ae404, {}],
  ["Command.CharacterSlotBase", 0x09e504, {}],
  ["AdminCommand.CharacterSlotBase", 0x0ae504, {}],
  ["Command.ResourceBase", 0x09e804, {}],
  ["AdminCommand.ResourceBase", 0x0ae804, {}],
  ["Command.CharacterStateBase", 0x09e904, {}],
  ["AdminCommand.CharacterStateBase", 0x0ae904, {}],
  ["Command.ResistsBase", 0x09ea04, {}],
  ["AdminCommand.ResistsBase", 0x0aea04, {}],
  ["Command.LoadoutBase", 0x09eb04, {}],
  ["AdminCommand.LoadoutBase", 0x0aeb04, {}],
  ["Command.GiveBotOrders", 0x09f104, {}],
  ["AdminCommand.GiveBotOrders", 0x0af104, {}],
  ["Command.ReceiveBotOrders", 0x09f204, {}],
  ["AdminCommand.ReceiveBotOrders", 0x0af204, {}],
  ["Command.SetIgnoreMaxTrackables", 0x09ec04, {}],
  ["AdminCommand.SetIgnoreMaxTrackables", 0x0aec04, {}],
  ["Command.ToggleNavigationLab", 0x09ed04, {}],
  ["AdminCommand.ToggleNavigationLab", 0x0aed04, {}],
  ["Command.RequirementDebug", 0x09ee04, {}],
  ["AdminCommand.RequirementDebug", 0x0aee04, {}],
  ["Command.ConsolePrint", 0x09ef04, {}],
  ["AdminCommand.ConsolePrint", 0x0aef04, {}],
  ["Command.ReconcileItemList", 0x09f304, {}],
  ["AdminCommand.ReconcileItemList", 0x0af304, {}],
  ["Command.ReconcileItemListReply", 0x09f404, {}],
  ["AdminCommand.ReconcileItemListReply", 0x0af404, {}],
  ["Command.FillItem", 0x09f504, {}],
  ["AdminCommand.FillItem", 0x0af504, {}],
  ["Command.HeatMapList", 0x09f604, {}],
  ["AdminCommand.HeatMapList", 0x0af604, {}],
  ["Command.HeatMapResponse", 0x09f704, {}],
  ["AdminCommand.HeatMapResponse", 0x0af704, {}],
  ["Command.Weather", 0x09f904, {}],
  ["AdminCommand.Weather", 0x0af904, {}],
  ["Command.LockBase", 0x09fa04, {}],
  ["AdminCommand.LockBase", 0x0afa04, {}],
  ["Command.AbandonedItemsStats", 0x09fb04, {}],
  ["AdminCommand.AbandonedItemsStats", 0x0afb04, {}],
  ["Command.DatabaseBase", 0x09fd04, {}],
  ["AdminCommand.DatabaseBase", 0x0afd04, {}],
  ["Command.ModifyEntitlement", 0x09fe04, {}],
  ["AdminCommand.ModifyEntitlement", 0x0afe04, {}],

  ["ClientBeginZoning", 0x0b, {}],
  ["Combat.AutoAttackTarget", 0x0c01, {}],
  ["Combat.AutoAttackOff", 0x0c02, {}],
  ["Combat.SingleAttackTarget", 0x0c03, {}],
  ["Combat.AttackTargetDamage", 0x0c04, {}],
  ["Combat.AttackAttackerMissed", 0x0c05, {}],
  ["Combat.AttackTargetDodged", 0x0c06, {}],
  ["Combat.AttackProcessed", 0x0c07, {}],
  ["Combat.EnableBossDisplay", 0x0c09, {}],
  ["Combat.AttackTargetBlocked", 0x0c0a, {}],
  ["Combat.AttackTargetParried", 0x0c0b, {}],
  ["Mail", 0x0e, {}],
  ["PlayerUpdate.None", 0x0f00, {}],
  [
    "PlayerUpdate.RemovePlayer",
    0x0f010000,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  [
    "PlayerUpdate.RemovePlayerGracefully",
    0x0f010100,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknown5", type: "boolean" },
        { name: "unknown6", type: "uint32" },
        { name: "unknown7", type: "uint32" },
        { name: "unknown8", type: "uint32" },
        { name: "unknown9", type: "uint32" },
        { name: "unknown10", type: "uint32" },
      ],
    },
  ],
  ["PlayerUpdate.Knockback", 0x0f02, {}],
  ["PlayerUpdate.UpdateHitpoints", 0x0f03, {}],
  ["PlayerUpdate.PlayAnimation", 0x0f04, {}],
  ["PlayerUpdate.AddNotifications", 0x0f05, {}],
  ["PlayerUpdate.RemoveNotifications", 0x0f06, {}],
  [
    "PlayerUpdate.NpcRelevance",
    0x0f07,
    {
      fields: [
        {
          name: "npcs",
          type: "array",
          fields: [
            { name: "guid", type: "uint64" },
            { name: "unknownBoolean1", type: "boolean" },
            { name: "unknownByte1", type: "uint8" },
          ],
        },
      ],
    },
  ],
  ["PlayerUpdate.UpdateScale", 0x0f08, {}],
  ["PlayerUpdate.UpdateTemporaryAppearance", 0x0f09, {}],
  ["PlayerUpdate.RemoveTemporaryAppearance", 0x0f0a, {}],
  ["PlayerUpdate.PlayCompositeEffect", 0x0f0b, {}],
  ["PlayerUpdate.SetLookAt", 0x0f0c, {}],
  ["PlayerUpdate.RenamePlayer", 0x0f0d, {}],
  [
    "PlayerUpdate.UpdateCharacterState",
    0x0f0e,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "gameTime", type: "uint32" },
      ],
    },
  ],
  ["PlayerUpdate.QueueAnimation", 0x0f0f, {}],
  ["PlayerUpdate.ExpectedSpeed", 0x0f10, {}],
  ["PlayerUpdate.ScriptedAnimation", 0x0f11, {}],
  ["PlayerUpdate.ThoughtBubble", 0x0f12, {}],
  ["PlayerUpdate.SetDisposition", 0x0f13, {}],
  ["PlayerUpdate.LootEvent", 0x0f14, {}],
  ["PlayerUpdate.SlotCompositeEffectOverride", 0x0f15, {}],
  ["PlayerUpdate.EffectPackage", 0x0f16, {}],
  ["PlayerUpdate.PreferredLanguages", 0x0f17, {}],
  ["PlayerUpdate.CustomizationChange", 0x0f18, {}],
  ["PlayerUpdate.PlayerTitle", 0x0f19, {}],
  ["PlayerUpdate.AddEffectTagCompositeEffect", 0x0f1a, {}],
  ["PlayerUpdate.RemoveEffectTagCompositeEffect", 0x0f1b, {}],
  ["PlayerUpdate.SetSpawnAnimation", 0x0f1c, {}],
  ["PlayerUpdate.CustomizeNpc", 0x0f1d, {}],
  ["PlayerUpdate.SetSpawnerActivationEffect", 0x0f1e, {}],
  ["PlayerUpdate.SetComboState", 0x0f1f, {}],
  ["PlayerUpdate.SetSurpriseState", 0x0f20, {}],
  ["PlayerUpdate.RemoveNpcCustomization", 0x0f21, {}],
  ["PlayerUpdate.ReplaceBaseModel", 0x0f22, {}],
  ["PlayerUpdate.SetCollidable", 0x0f23, {}],
  ["PlayerUpdate.UpdateOwner", 0x0f24, {}],
  ["PlayerUpdate.WeaponStance", 0x0f25, {}],
  ["PlayerUpdate.UpdateTintAlias", 0x0f26, {}],
  ["PlayerUpdate.MoveOnRail", 0x0f27, {}],
  ["PlayerUpdate.ClearMovementRail", 0x0f28, {}],
  ["PlayerUpdate.MoveOnRelativeRail", 0x0f29, {}],
  [
    "PlayerUpdate.Destroyed",
    0x0f2a,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "uint32" },
        { name: "unknown3", type: "uint32" },
        { name: "unknown4", type: "uint8" },
      ],
    },
  ],
  ["PlayerUpdate.SeekTarget", 0x0f2b, {}],
  ["PlayerUpdate.SeekTargetUpdate", 0x0f2c, {}],
  [
    "PlayerUpdate.UpdateActiveWieldType",
    0x0f2d,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
      ],
    },
  ],
  ["PlayerUpdate.LaunchProjectile", 0x0f2e, {}],
  ["PlayerUpdate.SetSynchronizedAnimations", 0x0f2f, {}],
  ["PlayerUpdate.HudMessage", 0x0f30, {}],
  [
    "PlayerUpdate.CustomizationData",
    0x0f31,
    {
      fields: [
        {
          name: "customizationData",
          type: "array",
          fields: [
            { name: "unknown1", type: "uint32" },
            { name: "modelName", type: "string" },
            { name: "unknown3", type: "uint32" },
            { name: "unknown4", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["PlayerUpdate.MemberStatus", 0x0f32, {}],
  ["PlayerUpdate.SetCurrentAdventure", 0x0f33, {}],
  ["PlayerUpdate.StartHarvest", 0x0f34, {}],
  ["PlayerUpdate.StopHarvest", 0x0f35, {}],
  [
    "PlayerUpdate.KnockedOut",
    0x0f36,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  ["PlayerUpdate.KnockedOutDamageReport", 0x0f37, {}],
  [
    "PlayerUpdate.Respawn",
    0x0f38,
    {
      fields: [
        { name: "respawnType", type: "uint8" },
        { name: "respawnGuid", type: "uint64" },
        { name: "profileId", type: "uint32" },
        { name: "profileId2", type: "uint32" },
      ],
    },
  ],
  [
    "PlayerUpdate.RespawnReply",
    0x0f39,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "status", type: "boolean" },
      ],
    },
  ],
  ["PlayerUpdate.ReadyToReviveResponse", 0x0f3a, {}],
  ["PlayerUpdate.ActivateProfile", 0x0f3b, {}],
  ["PlayerUpdate.SetSpotted", 0x0f3c, {}],
  [
    "PlayerUpdate.Jet",
    0x0f3d,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "state", type: "uint8" },
      ],
    },
  ],
  ["PlayerUpdate.Turbo", 0x0f3e, {}],
  ["PlayerUpdate.StartRevive", 0x0f3f, {}],
  ["PlayerUpdate.StopRevive", 0x0f40, {}],
  ["PlayerUpdate.ReadyToRevive", 0x0f41, {}],
  [
    "PlayerUpdate.SetFaction",
    0x0f42,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "factionId", type: "uint8" },
      ],
    },
  ],
  [
    "PlayerUpdate.SetBattleRank",
    0x0f43,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "battleRank", type: "uint32" },
      ],
    },
  ],
  ["PlayerUpdate.StartHeal", 0x0f44, {}],
  ["PlayerUpdate.StopHeal", 0x0f45, {}],
  ["PlayerUpdate.Currency", 0x0f46, {}],
  ["PlayerUpdate.RewardCurrency", 0x0f47, {}],
  [
    "PlayerUpdate.ManagedObject",
    0x0f48,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "guid2", type: "uint64" },
        { name: "characterId", type: "uint64" },
      ],
    },
  ],
  ["PlayerUpdate.ManagedObjectRequestControl", 0x0f49, {}],
  ["PlayerUpdate.ManagedObjectResponseControl", 0x0f4a, {}],
  ["PlayerUpdate.ManagedObjectReleaseControl", 0x0f4b, {}],
  ["PlayerUpdate.MaterialTypeOverride", 0x0f4c, {}],
  ["PlayerUpdate.DebrisLaunch", 0x0f4d, {}],
  ["PlayerUpdate.HideCorpse", 0x0f4e, {}],
  [
    "PlayerUpdate.CharacterStateDelta",
    0x0f4f,
    {
      fields: [
        { name: "guid1", type: "uint64" },
        { name: "guid2", type: "uint64" },
        { name: "guid3", type: "uint64" },
        { name: "guid4", type: "uint64" },
        { name: "gameTime", type: "uint32" },
      ],
    },
  ],
  ["PlayerUpdate.UpdateStat", 0x0f50, {}],
  ["PlayerUpdate.AnimationRequest", 0x0f51, {}],
  ["PlayerUpdate.NonPriorityCharacters", 0x0f53, {}],
  ["PlayerUpdate.PlayWorldCompositeEffect", 0x0f54, {}],
  ["PlayerUpdate.AFK", 0x0f55, {}],
  [
    "PlayerUpdate.AddLightweightPc",
    0x0f56,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        {
          name: "transientId",
          type: "custom",
          parser: readUnsignedIntWith2bitLengthValue,
          packer: packUnsignedIntWith2bitLengthValue,
        },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "name", type: "string" },
        { name: "unknownString1", type: "string" },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownDword4", type: "uint32" },
        { name: "unknownDword5", type: "uint32" },
        { name: "position", type: "floatvector3" },
        { name: "rotation", type: "floatvector4" },
        { name: "unknownFloat1", type: "float" },
        { name: "unknownGuid1", type: "uint64" },
        { name: "unknownDword6", type: "uint32" },
        { name: "unknownDword7", type: "uint32" },
        { name: "unknownByte2", type: "uint8" },
        { name: "unknownDword8", type: "uint32" },
        { name: "unknownDword9", type: "uint32" },
        { name: "unknownGuid2", type: "uint64" },
        { name: "unknownByte3", type: "uint8" },
      ],
    },
  ],
  [
    "PlayerUpdate.AddLightweightNpc",
    0x0f57,
    {
      fields: lightWeightNpcSchema,
    },
  ],
  [
    "PlayerUpdate.AddLightweightVehicle",
    0x0f58,
    {
      fields: [
        { name: "npcData", type: "schema", fields: lightWeightNpcSchema },
        { name: "unknownGuid1", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        {
          name: "positionUpdate",
          type: "custom",
          parser: readPositionUpdateData,
          packer: packPositionUpdateData,
        },
        { name: "unknownString1", type: "string" },
      ],
    },
  ],
  ["PlayerUpdate.AddProxiedObject", 0x0f59, {}],
  ["PlayerUpdate.LightweightToFullPc", 0x0f5a, {}],
  [
    "PlayerUpdate.LightweightToFullNpc",
    0x0f5b,
    {
      fields: fullNpcDataSchema,
    },
  ],
  [
    "PlayerUpdate.LightweightToFullVehicle",
    0x0f5c,
    {
      fields: [
        { name: "npcData", type: "schema", fields: fullNpcDataSchema },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownDword1", type: "uint32" },
        {
          name: "unknownArray1",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownBoolean1", type: "boolean" },
          ],
        },
        {
          name: "unknownArray2",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownByte1", type: "boolean" },
          ],
        },
        { name: "unknownVector1", type: "floatvector4" },
        { name: "unknownVector2", type: "floatvector4" },
        { name: "unknownByte3", type: "uint8" },
        {
          name: "unknownArray3",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownQword1", type: "uint64" },
          ],
        },
        {
          name: "unknownArray4",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownQword1", type: "uint64" },
          ],
        },
        {
          name: "unknownArray5",
          type: "array",
          fields: [
            {
              name: "unknownData1",
              type: "schema",
              fields: [
                { name: "unknownQword1", type: "uint64" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownString1", type: "string" },
                    { name: "unknownString2", type: "string" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownString1", type: "string" },
              ],
            },
            { name: "unknownByte1", type: "uint8" },
          ],
        },
        {
          name: "unknownArray6",
          type: "array",
          fields: [{ name: "unknownString1", type: "string" }],
        },
        {
          name: "unknownArray7",
          type: "array",
          fields: itemWeaponDetailSubSchema1,
        },
        {
          name: "unknownArray8",
          type: "array",
          fields: itemWeaponDetailSubSchema2,
        },
        { name: "unknownFloat1", type: "float" },
      ],
    },
  ],
  [
    "PlayerUpdate.FullCharacterDataRequest",
    0x0f5d,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  ["PlayerUpdate.InitiateNameChange", 0x0f5e, {}],
  ["PlayerUpdate.NameChangeResult", 0x0f5f, {}],
  ["PlayerUpdate.NameValidationResult", 0x0f60, {}],
  ["PlayerUpdate.Deploy", 0x0f61, {}],
  ["PlayerUpdate.LowAmmoUpdate", 0x0f62, {}],
  ["PlayerUpdate.KilledBy", 0x0f63, {}],
  ["PlayerUpdate.MotorRunning", 0x0f64, {}],
  ["PlayerUpdate.DroppedIemNotification", 0x0f65, {}],
  ["PlayerUpdate.NoSpaceNotification", 0x0f66, {}],
  ["PlayerUpdate.StartMultiStateDeath", 0x0f68, {}],
  ["PlayerUpdate.AggroLevel", 0x0f69, {}],
  ["PlayerUpdate.DoorState", 0x0f6a, {}],
  ["PlayerUpdate.RequestToggleDoorState", 0x0f6b, {}],
  ["PlayerUpdate.BeginCharacterAccess", 0x0f6c, {}],
  ["PlayerUpdate.EndCharacterAccess", 0x0f6d, {}],
  ["PlayerUpdate.UpdateMutateRights", 0x0f6e, {}],
  ["PlayerUpdate.UpdateFogOfWar", 0x0f70, {}],
  ["PlayerUpdate.SetAllowRespawn", 0x0f71, {}],
  ["Ability.ClientRequestStartAbility", 0x1001, {}],
  ["Ability.ClientRequestStopAbility", 0x1002, {}],
  ["Ability.ClientMoveAndCast", 0x1003, {}],
  ["Ability.Failed", 0x1004, {}],
  ["Ability.StartCasting", 0x1005, {}],
  ["Ability.Launch", 0x1006, {}],
  ["Ability.Land", 0x1007, {}],
  ["Ability.StartChanneling", 0x1008, {}],
  ["Ability.StopCasting", 0x1009, {}],
  ["Ability.StopAura", 0x100a, {}],
  ["Ability.MeleeRefresh", 0x100b, {}],
  ["Ability.AbilityDetails", 0x100c, {}],
  ["Ability.PurchaseAbility", 0x100d, {}],
  ["Ability.UpdateAbilityExperience", 0x100e, {}],
  ["Ability.SetDefinition", 0x100f, {}],
  ["Ability.RequestAbilityDefinition", 0x1010, {}],
  ["Ability.AddAbilityDefinition", 0x1011, {}],
  ["Ability.PulseLocationTargeting", 0x1012, {}],
  ["Ability.ReceivePulseLocation", 0x1013, {}],
  ["Ability.ActivateItemAbility", 0x1014, {}],
  ["Ability.ActivateVehicleAbility", 0x1015, {}],
  ["Ability.DeactivateItemAbility", 0x1016, {}],
  ["Ability.DeactivateVehicleAbility", 0x1017, {}],
  ["ClientUpdate.Hitpoints", 0x110100, {}],
  [
    "ClientUpdate.ItemAdd",
    0x110200,
    {
      fields: [
        {
          name: "itemAddData",
          type: "custom",
          parser: parseItemAddData,
          packer: packItemAddData,
        },
      ],
    },
  ],
  ["ClientUpdate.ItemUpdate", 0x110300, {}],
  ["ClientUpdate.ItemDelete", 0x110400, {}],
  [
    "ClientUpdate.UpdateStat",
    0x110500,
    {
      fields: [{ name: "stats", type: "array", fields: statDataSchema }],
    },
  ],
  ["ClientUpdate.CollectionStart", 0x110600, {}],
  ["ClientUpdate.CollectionRemove", 0x110700, {}],
  ["ClientUpdate.CollectionAddEntry", 0x110800, {}],
  ["ClientUpdate.CollectionRemoveEntry", 0x110900, {}],
  ["ClientUpdate.UpdateLocation", 0x110a00, {}],
  ["ClientUpdate.Mana", 0x110b00, {}],
  ["ClientUpdate.UpdateProfileExperience", 0x110c00, {}],
  ["ClientUpdate.AddProfileAbilitySetApl", 0x110d00, {}],
  ["ClientUpdate.AddEffectTag", 0x110e00, {}],
  ["ClientUpdate.RemoveEffectTag", 0x110f00, {}],
  ["ClientUpdate.UpdateProfileRank", 0x111000, {}],
  ["ClientUpdate.CoinCount", 0x111100, {}],
  ["ClientUpdate.DeleteProfile", 0x111200, {}],
  [
    "ClientUpdate.ActivateProfile",
    0x111300,
    {
      fields: [
        {
          name: "profileData",
          type: "byteswithlength",
          fields: profileDataSchema,
        },
        {
          name: "attachmentData",
          type: "array",
          fields: [
            { name: "modelName", type: "string" },
            { name: "unknownString1", type: "string" },
            { name: "tintAlias", type: "string" },
            { name: "unknownString2", type: "string" },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "slotId", type: "uint32" },
          ],
        },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownDword4", type: "uint32" },
        { name: "unknownString1", type: "string" },
        { name: "unknownString2", type: "string" },
      ],
    },
  ],
  ["ClientUpdate.AddAbility", 0x111400, {}],
  ["ClientUpdate.NotifyPlayer", 0x111500, {}],
  ["ClientUpdate.UpdateProfileAbilitySetApl", 0x111600, {}],
  ["ClientUpdate.RemoveActionBars", 0x111700, {}],
  ["ClientUpdate.UpdateActionBarSlot", 0x111800, {}],
  [
    "ClientUpdate.DoneSendingPreloadCharacters",
    0x111900,
    {
      fields: [{ name: "unknownBoolean1", type: "uint8" }],
    },
  ],
  ["ClientUpdate.SetGrandfatheredStatus", 0x111a00, {}],
  ["ClientUpdate.UpdateActionBarSlotUsed", 0x111b00, {}],
  ["ClientUpdate.PhaseChange", 0x111c00, {}],
  ["ClientUpdate.UpdateKingdomExperience", 0x111d00, {}],
  ["ClientUpdate.DamageInfo", 0x111e00, {}],
  [
    "ClientUpdate.ZonePopulation",
    0x111f00,
    {
      fields: [
        // { name: "populations",                  type: "array",     elementType: "uint8" }
      ],
    },
  ],
  [
    "ClientUpdate.RespawnLocations",
    0x112000,
    {
      // fields: [
      //     { name: "unknownFlags",                 type: "uint8" },
      //     { name: "locations",                    type: "array",  fields: respawnLocationDataSchema },
      //     { name: "unknownDword1",                type: "uint32" },
      //     { name: "unknownDword2",                type: "uint32" },
      //     { name: "locations2",                   type: "array",  fields: respawnLocationDataSchema }
      // ]
    },
  ],
  ["ClientUpdate.ModifyMovementSpeed", 0x112100, {}],
  ["ClientUpdate.ModifyTurnRate", 0x112200, {}],
  ["ClientUpdate.ModifyStrafeSpeed", 0x112300, {}],
  ["ClientUpdate.UpdateManagedLocation", 0x112400, {}],
  ["ClientUpdate.ScreenEffect", 0x112500, {}],
  [
    "ClientUpdate.MovementVersion",
    0x112600,
    {
      fields: [{ name: "version", type: "uint8" }],
    },
  ],
  [
    "ClientUpdate.ManagedMovementVersion",
    0x112700,
    {
      fields: [
        {
          name: "version",
          type: "custom",
          parser: readUnsignedIntWith2bitLengthValue,
          packer: packUnsignedIntWith2bitLengthValue,
        },
      ],
    },
  ],
  [
    "ClientUpdate.UpdateWeaponAddClips",
    0x112800,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownFloat1", type: "float" },
      ],
    },
  ],
  ["ClientUpdate.SpotProbation", 0x112900, {}],
  ["ClientUpdate.DailyRibbonCount", 0x112a00, {}],
  ["ClientUpdate.DespawnNpcUpdate", 0x112b00, {}],
  ["ClientUpdate.LoyaltyPoints", 0x112c00, {}],
  ["ClientUpdate.Membership", 0x112d00, {}],
  ["ClientUpdate.ResetMissionRespawnTimer", 0x112e00, {}],
  ["ClientUpdate.Freeze", 0x112f00, {}],
  ["ClientUpdate.InGamePurchaseResult", 0x113000, {}],
  ["ClientUpdate.QuizComplete", 0x113100, {}],
  ["ClientUpdate.StartTimer", 0x113200, []],
  ["ClientUpdate.CompleteLogoutProcess", 0x113300, []],
  ["ClientUpdate.ProximateItems", 0x113400, []],
  ["ClientUpdate.TextAlert", 0x113500, []],
  ["ClientUpdate.ClearEntitlementValues", 0x113600, []],
  ["ClientUpdate.AddEntitlementValue", 0x113700, []],
  ["MiniGame", 0x12, {}],
  ["Group", 0x13, {}],
  ["Encounter", 0x14, {}],
  ["Inventory", 0x15, {}],
  [
    "SendZoneDetails",
    0x16,
    {
      fields: [
        { name: "zoneName", type: "string" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownFloat1", type: "float" },
        {
          name: "skyData",
          type: "schema",
          fields: [
            { name: "name", type: "string" },
            { name: "unknownDword1", type: "int32" },
            { name: "unknownDword2", type: "int32" },
            { name: "unknownDword3", type: "int32" },
            { name: "unknownDword4", type: "int32" },
            { name: "unknownDword5", type: "int32" },
            { name: "unknownDword6", type: "int32" },
            { name: "unknownDword7", type: "int32" },
            { name: "unknownDword8", type: "int32" },
            { name: "unknownDword9", type: "int32" },
            { name: "unknownDword10", type: "int32" },
            { name: "unknownDword11", type: "int32" },
            { name: "unknownDword12", type: "int32" },
            { name: "unknownDword13", type: "int32" },
            { name: "unknownDword14", type: "int32" },
            { name: "unknownDword15", type: "int32" },
            { name: "unknownDword16", type: "int32" },
            { name: "unknownDword17", type: "int32" },
            { name: "unknownDword18", type: "int32" },
            { name: "unknownDword19", type: "int32" },
            { name: "unknownDword20", type: "int32" },
            { name: "unknownDword21", type: "int32" },
            { name: "unknownDword22", type: "int32" },
            { name: "unknownDword23", type: "int32" },
            { name: "unknownDword24", type: "int32" },
            { name: "unknownDword25", type: "int32" },
            {
              name: "unknownArray",
              type: "array",
              length: 50,
              fields: [
                { name: "unknownDword1", type: "int32" },
                { name: "unknownDword2", type: "int32" },
                { name: "unknownDword3", type: "int32" },
                { name: "unknownDword4", type: "int32" },
                { name: "unknownDword5", type: "int32" },
                { name: "unknownDword6", type: "int32" },
                { name: "unknownDword7", type: "int32" },
              ],
            },
          ],
        },
        { name: "zoneId1", type: "uint32" },
        { name: "zoneId2", type: "uint32" },
        { name: "nameId", type: "uint32" },
        { name: "unknownBoolean7", type: "boolean" },
      ],
    },
  ],
  ["ReferenceData.ItemClassDefinitions", 0x1701, {}],
  ["ReferenceData.ItemCategoryDefinitions", 0x1702, {}],
  [
    "ReferenceData.ClientProfileData",
    0x1703,
    {
      fields: [
        {
          name: "profiles",
          type: "array",
          fields: [
            { name: "profileId", type: "uint32" },
            {
              name: "profileData",
              type: "schema",
              fields: [
                { name: "profileId", type: "uint32" },
                { name: "nameId", type: "uint32" },
                { name: "descriptionId", type: "uint32" },
                { name: "profileType", type: "uint32" },
                { name: "iconId", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownDword7", type: "uint32" },
                { name: "unknownDword8", type: "uint32" },
                { name: "unknownDword9", type: "uint32" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownBoolean2", type: "boolean" },
                { name: "unknownDword10", type: "uint32" },
                { name: "unknownDword11", type: "uint32" },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                  ],
                },
                { name: "firstPersonArms1", type: "uint32" },
                { name: "firstPersonArms2", type: "uint32" },
                { name: "unknownDword14", type: "uint32" },
                {
                  name: "unknownArray2",
                  type: "array",
                  fields: [{ name: "unknownDword1", type: "uint32" }],
                },
                { name: "unknownFloat1", type: "float" },
                { name: "unknownFloat2", type: "float" },
                { name: "unknownFloat3", type: "float" },
                { name: "unknownFloat4", type: "float" },
                { name: "unknownDword15", type: "uint32" },
                { name: "unknownDword16", type: "uint32" },
                { name: "unknownDword17", type: "uint32" },
                { name: "imageSetId1", type: "uint32" },
                { name: "imageSetId2", type: "uint32" },
              ],
            },
          ],
        },
      ],
    },
  ],
  [
    "ReferenceData.WeaponDefinitions",
    0x1704,
    {
      fields: [{ name: "data", type: "byteswithlength" }],
    },
  ],
  ["ReferenceData.ProjectileDefinitions", 0x1705, {}],
  [
    "ReferenceData.VehicleDefinitions",
    0x1706,
    {
      fields: [
        {
          name: "data",
          type: "custom",
          parser: parseVehicleReferenceData,
          packer: packVehicleReferenceData,
        },
      ],
    },
  ],
  ["Objective", 0x18, {}],
  ["Debug", 0x19, {}],
  ["Ui.TaskAdd", 0x1a01, {}],
  ["Ui.TaskUpdate", 0x1a02, {}],
  ["Ui.TaskComplete", 0x1a03, {}],
  ["Ui.TaskFail", 0x1a04, {}],
  ["Ui.Unknown", 0x1a05, {}],
  ["Ui.ExecuteScript", 0x1a07, {}],
  ["Ui.StartTimer", 0x1a09, {}],
  ["Ui.ResetTimer", 0x1a0a, {}],
  ["Ui.ObjectiveTargetUpdate", 0x1a0d, {}],
  ["Ui.Message", 0x1a0e, {}],
  ["Ui.CinematicStartLookAt", 0x1a0f, {}],
  ["Ui.WeaponHitFeedback", 0x1a10, {}],
  ["Ui.HeadShotFeedback", 0x1a11, {}],
  ["Ui.WaypointCooldown", 0x1a14, {}],
  ["Ui.ZoneWaypoint", 0x1a15, {}],
  ["Ui.WaypointNotify", 0x1a16, {}],
  ["Ui.ContinentDominationNotification", 0x1a17, {}],
  ["Ui.InteractStart", 0x1a18, {}],
  ["Ui.SomeInteractionThing", 0x1a19, {}],
  ["Ui.RewardNotification", 0x1a1a, {}],
  ["Ui.WarpgateRotateWarning", 0x1a1b, {}],
  ["Ui.SystemBroadcast", 0x1a1c, {}],
  ["Quest", 0x1b, {}],
  ["Reward", 0x1c, {}],
  [
    "GameTimeSync",
    0x1d,
    {
      fields: [
        { name: "time", type: "uint64" },
        { name: "unknownFloat1", type: "float" },
        { name: "unknownBoolean1", type: "boolean" },
      ],
    },
  ],
  ["Pet", 0x1e, {}],
  ["PointOfInterestDefinitionRequest", 0x1f, {}],
  ["PointOfInterestDefinitionReply", 0x20, {}],
  ["WorldTeleportRequest", 0x21, {}],
  ["Trade", 0x22, {}],
  ["EscrowGivePackage", 0x23, {}],
  ["EscrowGotPackage", 0x24, {}],
  ["UpdateEncounterDataCommon", 0x25, {}],
  ["Recipe.Add", 0x2601, {}],
  ["Recipe.ComponentUpdate", 0x2602, {}],
  ["Recipe.Remove", 0x2603, {}],
  [
    "Recipe.List",
    0x2605,
    {
      fields: [
        {
          name: "recipes",
          type: "array",
          fields: [
            { name: "recipeId", type: "uint32" },
            {
              name: "recipeData",
              type: "schema",
              fields: [
                { name: "recipeId", type: "uint32" },
                { name: "nameId", type: "uint32" },
                { name: "iconId", type: "uint32" },
                { name: "unknownDword1", type: "uint32" },
                { name: "descriptionId", type: "uint32" },
                { name: "rewardCount", type: "uint32" },
                { name: "membersOnly", type: "boolean" },
                { name: "discovered", type: "uint32" },
                {
                  name: "components",
                  type: "array",
                  fields: [
                    { name: "componentId", type: "uint32" },
                    {
                      name: "componentData",
                      type: "schema",
                      fields: [
                        { name: "nameId", type: "uint32" },
                        { name: "iconId", type: "uint32" },
                        { name: "unknownDword1", type: "uint32" },
                        { name: "descriptionId", type: "uint32" },
                        { name: "requiredCount", type: "uint32" },
                        { name: "unknownDword2", type: "uint32" },
                        { name: "unknownDword3", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                        { name: "itemId", type: "uint32" },
                      ],
                    },
                  ],
                },
                { name: "rewardItemId", type: "uint32" },
              ],
            },
          ],
        },
      ],
    },
  ],
  ["InGamePurchase.PreviewOrderRequest", 0x270100, {}],
  ["InGamePurchase.PreviewOrderResponse", 0x270200, {}],
  ["InGamePurchase.PlaceOrderRequest", 0x270300, {}],
  ["InGamePurchase.PlaceOrderResponse", 0x270400, {}],
  [
    "InGamePurchase.StoreBundles",
    0x27050000,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "storeId", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownDword4", type: "uint32" },
        {
          name: "imageData",
          type: "schema",
          fields: [
            { name: "imageSetId", type: "string" },
            { name: "imageTintValue", type: "string" },
          ],
        },
        {
          name: "storeBundles",
          type: "array",
          fields: [
            { name: "bundleId", type: "uint32" },
            {
              name: "appStoreBundle",
              type: "schema",
              fields: [
                {
                  name: "storeBundle",
                  type: "schema",
                  fields: [
                    {
                      name: "marketingBundle",
                      type: "schema",
                      fields: [
                        { name: "bundleId", type: "uint32" },
                        { name: "nameId", type: "uint32" },
                        { name: "descriptionId", type: "uint32" },
                        { name: "unknownDword4", type: "uint32" },
                        {
                          name: "imageData",
                          type: "schema",
                          fields: [
                            { name: "imageSetId", type: "string" },
                            { name: "imageTintValue", type: "string" },
                          ],
                        },
                        { name: "unknownBoolean1", type: "boolean" },
                        { name: "unknownString1", type: "string" },
                        { name: "stationCurrencyId", type: "uint32" },
                        { name: "price", type: "uint32" },
                        { name: "currencyId", type: "uint32" },
                        { name: "currencyPrice", type: "uint32" },
                        { name: "unknownDword9", type: "uint32" },
                        { name: "unknownTime1", type: "uint64" },
                        { name: "unknownTime2", type: "uint64" },
                        { name: "unknownDword10", type: "uint32" },
                        { name: "unknownBoolean2", type: "boolean" },
                        {
                          name: "itemListDetails",
                          type: "array",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "imageSetId", type: "uint32" },
                            { name: "itemId", type: "uint32" },
                            { name: "unknownString1", type: "string" },
                          ],
                        },
                      ],
                    },
                    { name: "storeId", type: "uint32" },
                    { name: "categoryId", type: "uint32" },
                    { name: "unknownBoolean1", type: "boolean" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "unknownDword4", type: "uint32" },
                    { name: "unknownDword5", type: "uint32" },
                    { name: "unknownDword6", type: "uint32" },
                    { name: "unknownDword7", type: "uint32" },
                    { name: "unknownDword8", type: "uint32" },
                    { name: "unknownDword9", type: "uint32" },
                    { name: "unknownDword10", type: "uint32" },
                    { name: "unknownBoolean2", type: "boolean" },
                    { name: "unknownBoolean3", type: "boolean" },
                    { name: "unknownBoolean4", type: "boolean" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownString1", type: "string" },
                { name: "unknownDword7", type: "uint32" },
                { name: "unknownDword8", type: "uint32" },
                { name: "unknownDword9", type: "uint32" },
                { name: "memberSalePrice", type: "uint32" },
                { name: "unknownDword11", type: "uint32" },
                { name: "unknownString2", type: "string" },
                { name: "unknownDword12", type: "uint32" },
                { name: "unknownBoolean1", type: "boolean" },
              ],
            },
          ],
        },
        { name: "offset", type: "debugoffset" },
      ],
    },
  ],
  ["InGamePurchase.StoreBundleStoreUpdate", 0x27050001, {}],
  ["InGamePurchase.StoreBundleStoreBundleUpdate", 0x27050002, {}],
  ["InGamePurchase.StoreBundleCategoryGroups", 0x270600, {}],
  [
    "InGamePurchase.StoreBundleCategories",
    0x270700,
    {
      fields: [
        {
          name: "categories",
          type: "array",
          fields: [
            { name: "categoryId", type: "uint32" },
            {
              name: "categoryData",
              type: "schema",
              fields: [
                { name: "categoryId", type: "uint32" },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownString1", type: "string" },
                { name: "unknownString2", type: "string" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownDword2", type: "uint32" },
                {
                  name: "unknownArray1",
                  type: "array",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                  ],
                },
                { name: "unknownDword3", type: "uint32" },
              ],
            },
          ],
        },
      ],
    },
  ],
  ["InGamePurchase.ExclusivePartnerStoreBundles", 0x270800, {}],
  ["InGamePurchase.StoreBundleGroups", 0x270900, {}],
  ["InGamePurchase.WalletInfoRequest", 0x270a00, {}],
  [
    "InGamePurchase.WalletInfoResponse",
    0x270b00,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownString1", type: "string" },
        { name: "unknownString2", type: "string" },
        { name: "unknownBoolean2", type: "boolean" },
      ],
    },
  ],
  ["InGamePurchase.ServerStatusRequest", 0x270c00, {}],
  ["InGamePurchase.ServerStatusResponse", 0x270d00, {}],
  ["InGamePurchase.StationCashProductsRequest", 0x270e00, {}],
  ["InGamePurchase.StationCashProductsResponse", 0x270f00, {}],
  ["InGamePurchase.CurrencyCodesRequest", 0x271000, {}],
  ["InGamePurchase.CurrencyCodesResponse", 0x271100, {}],
  ["InGamePurchase.StateCodesRequest", 0x271200, {}],
  ["InGamePurchase.StateCodesResponse", 0x271300, {}],
  ["InGamePurchase.CountryCodesRequest", 0x271400, {}],
  ["InGamePurchase.CountryCodesResponse", 0x271500, {}],
  ["InGamePurchase.SubscriptionProductsRequest", 0x271600, {}],
  ["InGamePurchase.SubscriptionProductsResponse", 0x271700, {}],
  [
    "InGamePurchase.EnableMarketplace",
    0x271800,
    {
      fields: [
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownBoolean2", type: "boolean" },
      ],
    },
  ],
  [
    "InGamePurchase.AcccountInfoRequest",
    0x271900,
    {
      fields: [{ name: "locale", type: "string" }],
    },
  ],
  ["InGamePurchase.AcccountInfoResponse", 0x271a00, {}],
  ["InGamePurchase.StoreBundleContentRequest", 0x271b00, {}],
  ["InGamePurchase.StoreBundleContentResponse", 0x271c00, {}],
  ["InGamePurchase.ClientStatistics", 0x271d00, {}],
  ["InGamePurchase.SendMannequinStoreBundlesToClient", 0x271e00, {}],
  ["InGamePurchase.DisplayMannequinStoreBundles", 0x271f00, {}],
  [
    "InGamePurchase.ItemOfTheDay",
    0x272000,
    {
      fields: [{ name: "bundleId", type: "uint32" }],
    },
  ],
  ["InGamePurchase.EnablePaymentSources", 0x272100, {}],
  ["InGamePurchase.SetMembershipFreeItemInfo", 0x272200, {}],
  ["InGamePurchase.WishListAddBundle", 0x272300, {}],
  ["InGamePurchase.WishListRemoveBundle", 0x272400, {}],
  ["InGamePurchase.PlaceOrderRequestClientTicket", 0x272500, {}],
  ["InGamePurchase.GiftOrderNotification", 0x272600, {}],
  [
    "InGamePurchase.ActiveSchedules",
    0x272700,
    {
      fields: [
        {
          name: "unknown1",
          type: "array",
          fields: [{ name: "id", type: "uint32" }],
        },
        { name: "unknown2", type: "uint32" },
        {
          name: "unknown3",
          type: "array",
          fields: [
            { name: "scheduleId", type: "uint32" },
            { name: "time", type: "uint32" },
            { name: "unknown1", type: "uint32" },
            { name: "unknown2", type: "uint8" },
            { name: "unknown3", type: "uint8" },
            { name: "unknown4", type: "uint8" },
            { name: "unknown5", type: "uint8" },
          ],
        },
      ],
    },
  ],
  ["InGamePurchase.LoyaltyInfoAndStoreRequest", 0x272800, {}],
  ["InGamePurchase.NudgeOfferNotification", 0x272900, {}],
  ["InGamePurchase.NudgeRequestStationCashProducts", 0x272a00, {}],
  ["InGamePurchase.SpiceWebAuthUrlRequest", 0x272b00, {}],
  ["InGamePurchase.SpiceWebAuthUrlResponse", 0x272c00, {}],
  ["InGamePurchase.BundlePriceUpdate", 0x272d00, {}],
  ["InGamePurchase.WalletBalanceUpdate", 0x272e00, {}],
  ["InGamePurchase.MemberFreeItemCount", 0x272f00, {}],
  [
    "QuickChat.SendData",
    0x280100,
    {
      fields: [
        {
          name: "commands",
          type: "array",
          fields: [
            { name: "commandId", type: "uint32" },
            {
              name: "commandData",
              type: "schema",
              fields: [
                { name: "commandId", type: "uint32" },
                { name: "menuStringId", type: "uint32" },
                { name: "chatStringId", type: "uint32" },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
                { name: "unknownDword3", type: "uint32" },
                { name: "unknownDword4", type: "uint32" },
                { name: "unknownDword5", type: "uint32" },
                { name: "unknownDword6", type: "uint32" },
                { name: "unknownDword7", type: "uint32" },
              ],
            },
          ],
        },
      ],
    },
  ],
  ["QuickChat.SendTell", 0x2802, {}],
  ["QuickChat.SendChatToChannel", 0x2803, {}],
  ["Report", 0x29, {}],
  ["LiveGamer", 0x2a, {}],
  ["Acquaintance", 0x2b, {}],
  ["ClientServerShuttingDown", 0x2c, {}],
  [
    "Friend.List",
    0x2d01,
    {
      fields: [
        {
          name: "friends",
          type: "array",
          fields: [
            { name: "unknown1", type: "uint32" },
            { name: "unknown2", type: "uint32" },
            { name: "unknown3", type: "uint32" },
            { name: "characterName", type: "string" },
            { name: "unknown4", type: "uint32" },
            { name: "characterId", type: "uint64" },
            {
              name: "is_online_data",
              type: "variabletype8",
              types: {
                0: [
                  { name: "unknown5", type: "uint32" },
                  { name: "unknown6", type: "uint32" },
                ],
                1: [
                  { name: "unknown5", type: "uint32" },
                  { name: "unknown6", type: "uint32" },
                  { name: "unknown7", type: "uint32" },
                  { name: "unknown8", type: "uint32" },
                  { name: "unknown9", type: "uint8" },
                  { name: "location_x", type: "float" },
                  { name: "location_y", type: "float" },
                  { name: "unknown10", type: "uint32" },
                  { name: "unknown11", type: "uint32" },
                  { name: "unknown12", type: "uint32" },
                  { name: "unknown13", type: "uint32" },
                  { name: "unknown14", type: "uint8" },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
  ["Friend.Online", 0x2d02, {}],
  ["Friend.Offline", 0x2d03, {}],
  ["Friend.UpdateProfileInfo", 0x2d04, {}],
  ["Friend.UpdatePositions", 0x2d05, {}],
  ["Friend.Add", 0x2d06, {}],
  ["Friend.Remove", 0x2d07, {}],
  [
    "Friend.Message",
    0x2d08,
    {
      fields: [
        { name: "messageType", type: "uint8" },
        { name: "messageTime", type: "uint64" },
        {
          name: "messageData1",
          type: "schema",
          fields: [
            { name: "unknowndDword1", type: "uint32" },
            { name: "unknowndDword2", type: "uint32" },
            { name: "unknowndDword3", type: "uint32" },
            { name: "characterName", type: "string" },
            { name: "unknownString1", type: "string" },
          ],
        },
        {
          name: "messageData2",
          type: "schema",
          fields: [
            { name: "unknowndDword1", type: "uint32" },
            { name: "unknowndDword2", type: "uint32" },
            { name: "unknowndDword3", type: "uint32" },
            { name: "characterName", type: "string" },
            { name: "unknownString1", type: "string" },
          ],
        },
      ],
    },
  ],
  ["Friend.Status", 0x2d09, {}],
  ["Friend.Rename", 0x2d0a, {}],
  ["Broadcast", 0x2e, {}],
  ["ClientKickedFromServer", 0x2f, {}],
  [
    "UpdateClientSessionData",
    0x30,
    {
      fields: [
        { name: "sessionId", type: "string" },
        { name: "stationName", type: "string" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownString1", type: "string" },
        { name: "unknownString2", type: "string" },
        { name: "stationCode", type: "string" },
        { name: "unknownString3", type: "string" },
      ],
    },
  ],
  ["BugSubmission", 0x31, {}],
  [
    "WorldDisplayInfo",
    0x32,
    {
      fields: [{ name: "worldId", type: "uint32" }],
    },
  ],
  ["MOTD", 0x33, {}],
  [
    "SetLocale",
    0x34,
    {
      fields: [{ name: "locale", type: "string" }],
    },
  ],
  ["SetClientArea", 0x35, {}],
  ["ZoneTeleportRequest", 0x36, {}],
  ["TradingCard", 0x37, {}],
  ["WorldShutdownNotice", 0x38, {}],
  ["LoadWelcomeScreen", 0x39, {}],
  ["ShipCombat", 0x3a, {}],
  ["AdminMiniGame", 0x3b, {}],
  [
    "KeepAlive",
    0x3c,
    {
      fields: [{ name: "gameTime", type: "uint32" }],
    },
  ],
  ["ClientExitLaunchUrl", 0x3d, {}],
  ["ClientPath", 0x3e, {}],
  ["ClientPendingKickFromServer", 0x3f, {}],
  [
    "MembershipActivation",
    0x40,
    {
      fields: [{ name: "unknown", type: "uint32" }],
    },
  ],
  ["Lobby.JoinLobbyGame", 0x4101, {}],
  ["Lobby.LeaveLobbyGame", 0x4102, {}],
  ["Lobby.StartLobbyGame", 0x4103, {}],
  ["Lobby.UpdateLobbyGame", 0x4104, {}],
  ["Lobby.SendLobbyToClient", 0x4106, {}],
  ["Lobby.SendLeaveLobbyToClient", 0x4107, {}],
  ["Lobby.RemoveLobbyGame", 0x4108, {}],
  ["Lobby.LobbyErrorMessage", 0x410b, {}],
  ["Lobby.ShowLobbyUi", 0x410c, {}],
  [
    "LobbyGameDefinition.DefinitionsRequest",
    0x420100,
    {
      fields: [],
    },
  ],
  [
    "LobbyGameDefinition.DefinitionsResponse",
    0x420200,
    {
      fields: [{ name: "definitionsData", type: "byteswithlength" }],
    },
  ],
  ["ShowSystemMessage", 0x43, {}],
  ["POIChangeMessage", 0x44, {}],
  ["ClientMetrics", 0x45, {}],
  ["FirstTimeEvent", 0x46, {}],
  ["Claim", 0x47, {}],
  [
    "ClientLog",
    0x48,
    {
      fields: [
        { name: "file", type: "string" },
        { name: "message", type: "string" },
      ],
    },
  ],
  ["Ignore", 0x49, {}],
  ["SnoopedPlayer", 0x4a, {}],
  ["Promotional", 0x4b, {}],
  ["AddClientPortraitCrc", 0x4c, {}],
  ["ObjectiveTarget", 0x4d, {}],
  ["CommerceSessionRequest", 0x4e, {}],
  ["CommerceSessionResponse", 0x4f, {}],
  ["TrackedEvent", 0x50, {}],
  ["LoginFailed", 0x51, {}],
  ["LoginToUChat", 0x52, {}],
  ["ZoneSafeTeleportRequest", 0x53, {}],
  ["RemoteInteractionRequest", 0x54, {}],
  ["UpdateCamera", 0x57, {}],
  ["Guild.Disband", 0x5802, {}],
  ["Guild.Rename", 0x5803, {}],
  ["Guild.ChangeMemberRank", 0x580a, {}],
  ["Guild.MotdUpdate", 0x580b, {}],
  ["Guild.UpdateRank", 0x580e, {}],
  ["Guild.DataFull", 0x580f, {}],
  ["Guild.Data", 0x5810, {}],
  ["Guild.Invitations", 0x5811, {}],
  ["Guild.AddMember", 0x5812, {}],
  ["Guild.RemoveMember", 0x5813, {}],
  ["Guild.UpdateInvitation", 0x5814, {}],
  ["Guild.MemberOnlineStatus", 0x5815, {}],
  ["Guild.TagsUpdated", 0x5816, {}],
  ["Guild.Notification", 0x5817, {}],
  ["Guild.UpdateAppData", 0x5820, {}],
  ["Guild.RecruitingGuildsForBrowserReply", 0x5826, {}],
  ["AdminGuild", 0x59, {}],
  ["BattleMages", 0x5a, {}],
  ["WorldToWorld", 0x5b, {}],
  ["PerformAction", 0x5c, {}],
  ["EncounterMatchmaking", 0x5d, {}],
  ["ClientLuaMetrics", 0x5e, {}],
  ["RepeatingActivity", 0x5f, {}],
  [
    "ClientGameSettings",
    0x60,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownFloat1", type: "float" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownDword4", type: "uint32" },
        { name: "unknownDword5", type: "uint32" },
        { name: "unknownFloat2", type: "float" },
        { name: "unknownFloat3", type: "float" },
      ],
    },
  ],
  ["ClientTrialProfileUpsell", 0x61, {}],
  ["ActivityManager.ProfileActivityList", 0x6201, {}],
  ["ActivityManager.JoinErrorString", 0x6202, {}],
  ["RequestSendItemDefinitionsToClient", 0x63, {}],
  ["Inspect", 0x64, {}],
  [
    "Achievement.Add",
    0x6502,
    {
      fields: [
        { name: "achievementId", type: "uint32" },
        {
          name: "achievementData",
          type: "schema",
          fields: objectiveDataSchema,
        },
      ],
    },
  ],
  [
    "Achievement.Initialize",
    0x6503,
    {
      fields: [
        {
          name: "clientAchievements",
          type: "array",
          fields: achievementDataSchema,
        },
        {
          name: "achievementData",
          type: "byteswithlength",
          fields: [
            {
              name: "achievements",
              type: "array",
              fields: achievementDataSchema,
            },
          ],
        },
      ],
    },
  ],
  ["Achievement.Complete", 0x6504, {}],
  ["Achievement.ObjectiveAdded", 0x6505, {}],
  ["Achievement.ObjectiveActivated", 0x6506, {}],
  ["Achievement.ObjectiveUpdate", 0x6507, {}],
  ["Achievement.ObjectiveComplete", 0x6508, {}],
  [
    "PlayerTitle",
    0x66,
    {
      fields: [
        { name: "unknown1", type: "uint8" },
        { name: "titleId", type: "uint32" },
      ],
    },
  ],
  ["Fotomat", 0x67, {}],
  ["UpdateUserAge", 0x68, {}],
  ["Loot", 0x69, {}],
  ["ActionBarManager", 0x6a, {}],
  ["ClientTrialProfileUpsellRequest", 0x6b, {}],
  ["PlayerUpdateJump", 0x6c, {}],
  [
    "CoinStore.ItemList",
    0x6d0100,
    {
      fields: [
        {
          name: "items",
          type: "array",
          fields: [
            { name: "itemId", type: "uint32" },
            {
              name: "itemData",
              type: "schema",
              fields: [
                { name: "itemId2", type: "uint32" },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownBoolean1", type: "boolean" },
                { name: "unknownBoolean2", type: "boolean" },
              ],
            },
          ],
        },
        { name: "unknown1", type: "uint32" },
      ],
    },
  ],
  ["CoinStore.ItemDefinitionsRequest", 0x6d0200, {}],
  ["CoinStore.ItemDefinitionsResponse", 0x6d0300, {}],
  [
    "CoinStore.SellToClientRequest",
    0x6d0400,
    {
      fields: [
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "uint32" },
        { name: "itemId", type: "uint32" },
        { name: "unknown4", type: "uint32" },
        { name: "quantity", type: "uint32" },
        { name: "unknown6", type: "uint32" },
      ],
    },
  ],
  ["CoinStore.BuyFromClientRequest", 0x6d0500, {}],
  [
    "CoinStore.TransactionComplete",
    0x6d0600,
    {
      fields: [
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "uint32" },
        { name: "unknown3", type: "uint32" },
        { name: "unknown4", type: "uint32" },
        { name: "unknown5", type: "uint32" },
        { name: "unknown6", type: "uint32" },
        { name: "unknown7", type: "uint32" },
        { name: "unknown8", type: "uint32" },
        { name: "timestamp", type: "uint32" },
        { name: "unknown9", type: "uint32" },
        { name: "itemId", type: "uint32" },
        { name: "unknown10", type: "uint32" },
        { name: "quantity", type: "uint32" },
        { name: "unknown11", type: "uint32" },
        { name: "unknown12", type: "uint8" },
      ],
    },
  ],
  ["CoinStore.Open", 0x6d0700, {}],
  ["CoinStore.ItemDynamicListUpdateRequest", 0x6d0800, {}],
  ["CoinStore.ItemDynamicListUpdateResponse", 0x6d0900, {}],
  ["CoinStore.MerchantList", 0x6d0a00, {}],
  ["CoinStore.ClearTransactionHistory", 0x6d0b00, {}],
  ["CoinStore.BuyBackRequest", 0x6d0c00, {}],
  ["CoinStore.BuyBackResponse", 0x6d0d00, {}],
  ["CoinStore.SellToClientAndGiftRequest", 0x6d0e00, {}],
  ["CoinStore.ReceiveGiftItem", 0x6d1100, {}],
  ["CoinStore.GiftTransactionComplete", 0x6d1200, {}],
  [
    "InitializationParameters",
    0x6e,
    {
      fields: [
        { name: "environment", type: "string" },
        { name: "serverId", type: "uint32" },
      ],
    },
  ],
  ["ActivityService.Activity.ListOfActivities", 0x6f0101, {}],
  ["ActivityService.Activity.UpdateActivityFeaturedStatus", 0x6f0105, {}],
  ["ActivityService.ScheduledActivity.ListOfActivities", 0x6f0201, {}],
  ["Mount.MountRequest", 0x7001, {}],
  [
    "Mount.MountResponse",
    0x7002,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "guid", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownDword4", type: "uint32" },
        {
          name: "characterData",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "characterName", type: "string" },
            { name: "unknownString1", type: "string" },
          ],
        },
        { name: "tagString", type: "string" },
        { name: "unknownDword5", type: "uint32" },
      ],
    },
  ],
  [
    "Mount.DismountRequest",
    0x7003,
    {
      fields: [{ name: "unknownByte1", type: "uint8" }],
    },
  ],
  [
    "Mount.DismountResponse",
    0x7004,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "guid", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownByte1", type: "uint8" },
      ],
    },
  ],
  ["Mount.List", 0x7005, {}],
  ["Mount.Spawn", 0x7006, {}],
  ["Mount.Despawn", 0x7007, {}],
  ["Mount.SpawnByItemDefinitionId", 0x7008, {}],
  ["Mount.OfferUpsell", 0x7009, {}],
  ["Mount.SeatChangeRequest", 0x700a, {}],
  ["Mount.SeatChangeResponse", 0x700b, {}],
  ["Mount.SeatSwapRequest", 0x700c, {}],
  ["Mount.SeatSwapResponse", 0x700d, {}],
  ["Mount.TypeCount", 0x700e, {}],
  [
    "ClientInitializationDetails",
    0x71,
    {
      fields: [{ name: "unknownDword1", type: "uint32" }],
    },
  ],
  ["ClientAreaTimer", 0x72, {}],
  ["LoyaltyReward.GiveLoyaltyReward", 0x7301, {}],
  ["Rating", 0x74, {}],
  ["ClientActivityLaunch", 0x75, {}],
  ["ServerActivityLaunch", 0x76, {}],
  ["ClientFlashTimer", 0x77, {}],
  [
    "PlayerUpdate.UpdatePosition",
    0x78,
    {
      fields: [{ name: "unknown1", type: "uint32" }],
    },
  ],
  ["InviteAndStartMiniGame", 0x79, {}],
  ["PlayerUpdate.Flourish", 0x7a, {}],
  ["Quiz", 0x7b, {}],
  ["PlayerUpdate.PositionOnPlatform", 0x7c, {}],
  ["ClientMembershipVipInfo", 0x7d, {}],
  ["Target", 0x7e, {}],
  ["GuideStone", 0x7f, {}],
  ["Raid", 0x80, {}],
  [
    "Voice.Login",
    0x8100,
    {
      fields: [
        { name: "clientName", type: "string" },
        { name: "sessionId", type: "string" },
        { name: "url", type: "string" },
        { name: "characterName", type: "string" },
      ],
    },
  ],
  [
    "Voice.JoinChannel",
    0x8101,
    {
      fields: [
        { name: "roomType", type: "uint8" },
        { name: "uri", type: "string" },
        { name: "unknown1", type: "uint32" },
      ],
    },
  ],
  ["Voice.LeaveChannel", 0x8102, {}],
  [
    "Weapon.Weapon",
    0x8200,
    {
      fields: [
        {
          name: "weaponPacket",
          type: "custom",
          parser: parseWeaponPacket,
          packer: packWeaponPacket,
        },
      ],
    },
  ],
  [
    "Facility.ReferenceData",
    0x8401,
    {
      fields: [{ name: "data", type: "byteswithlength" }],
    },
  ],
  [
    "Facility.FacilityData",
    0x8402,
    {
      fields: [
        {
          name: "facilities",
          type: "array",
          fields: [
            { name: "facilityId", type: "uint32" },
            { name: "facilityType", type: "uint8" },
            { name: "unknown2_uint8", type: "uint8" },
            { name: "regionId", type: "uint32" },
            { name: "nameId", type: "uint32" },
            { name: "locationX", type: "float" },
            { name: "locationY", type: "float" },
            { name: "locationZ", type: "float" },
            { name: "unknown3_float", type: "float" },
            { name: "imageSetId", type: "uint32" },
            { name: "unknown5_uint32", type: "uint32" },
            { name: "unknown6_uint8", type: "uint8" },
            { name: "unknown7_uint8", type: "uint8" },
            { name: "unknown8_bytes", type: "bytes", length: 36 },
          ],
        },
      ],
    },
  ],
  ["Facility.CurrentFacilityUpdate", 0x8403, {}],
  ["Facility.SpawnDataRequest", 0x8404, {}],
  ["Facility.FacilitySpawnData", 0x8405, {}],
  [
    "Facility.FacilityUpdate",
    0x8406,
    {
      fn: function (data, offset) {
        var result = {},
          startOffset = offset,
          n,
          i,
          values,
          flags;

        result["facilityId"] = data.readUInt32LE(offset);
        flags = data.readUInt16LE(offset + 4);
        result["flags"] = flags;
        offset += 6;
        if (flags & 1) {
          result["unknown1"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 1) & 1) {
          n = data.readUInt32LE(offset);
          values = [];
          for (i = 0; i < n; i++) {
            values[i] = data.readUInt8(offset + 4 + i);
          }
          result["unknown2"] = values;
          offset += 4 + n;
        }
        if ((flags >> 2) & 1) {
          result["unknown3"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 3) & 1) {
          n = data.readUInt32LE(offset);
          values = [];
          for (i = 0; i < n; i++) {
            values[i] = data.readUInt8(offset + 4 + i);
          }
          result["unknown4"] = values;
          offset += 4 + n;
        }
        if ((flags >> 4) & 1) {
          n = data.readUInt32LE(offset);
          values = [];
          for (i = 0; i < n; i++) {
            values[i] = data.readUInt8(offset + 4 + i);
          }
          result["unknown5"] = values;
          offset += 4 + n;
        }
        if ((flags >> 5) & 1) {
          values = [];
          for (i = 0; i < 4; i++) {
            values[i] = data.readUInt8(offset + i);
          }
          result["unknown6"] = values;
          offset += 4;
        }
        if ((flags >> 6) & 1) {
          result["unknown7"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 8) & 1) {
          result["unknown8"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 10) & 1) {
          result["unknown9"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 11) & 1) {
          result["unknown10"] = [
            data.readUInt32LE(offset),
            data.readUInt32LE(offset + 4),
          ];
          offset += 8;
        }
        if ((flags >> 12) & 1) {
          result["unknown11"] = data.readUInt8(offset);
          offset += 1;
        }
        if ((flags >> 13) & 1) {
          result["unknown12"] = data.readUInt32LE(offset);
          offset += 4;
        }
        return {
          result: result,
          length: offset - startOffset,
        };
      },
    },
  ],
  ["Facility.FacilitySpawnStatus", 0x8407, {}],
  ["Facility.FacilitySpawnStatusTracked", 0x8408, {}],
  ["Facility.NotificationFacilityCaptured", 0x8409, {}],
  ["Facility.NotificationFacilitySignificantCaptureProgress", 0x840a, {}],
  ["Facility.NotificationFacilityCloseToCapture", 0x840b, {}],
  ["Facility.NotificationFacilitySpawnBeginCapture", 0x840c, {}],
  ["Facility.NotificationFacilitySpawnFinishCapture", 0x840d, {}],
  ["Facility.NotificationLeavingFacilityDuringContention", 0x840e, {}],
  ["Facility.ProximitySpawnCaptureUpdate", 0x840f, {}],
  ["Facility.ClearProximitySpawn", 0x8410, {}],
  ["Facility.GridStabilizeTimerUpdated", 0x8411, {}],
  [
    "Facility.SpawnCollisionChanged",
    0x8412,
    {
      fields: [
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "boolean" },
        { name: "unknown3", type: "uint32" },
      ],
    },
  ],
  ["Facility.NotificationFacilitySecondaryObjectiveEventPacket", 0x8413, {}],
  ["Facility.PenetrateShieldEffect", 0x8414, {}],
  ["Facility.SpawnUpdateGuid", 0x8415, {}],
  ["Facility.FacilityUpdateRequest", 0x8416, {}],
  ["Facility.EmpireScoreValueUpdate", 0x8417, {}],
  ["Skill.Echo", 0x8501, {}],
  ["Skill.SelectSkillSet", 0x8502, {}],
  ["Skill.SelectSkill", 0x8503, {}],
  ["Skill.GetSkillPointManager", 0x8504, {}],
  ["Skill.SetLoyaltyPoints", 0x8505, {}],
  ["Skill.LoadSkillDefinitionManager", 0x8506, {}],
  ["Skill.SetSkillPointManager", 0x8507, {}],
  [
    "Skill.SetSkillPointProgress",
    0x8508,
    {
      fields: [
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "float" },
        { name: "unknown3", type: "float" },
      ],
    },
  ],
  ["Skill.AddSkill", 0x8509, {}],
  ["Skill.ReportSkillGrant", 0x850a, {}],
  ["Skill.ReportOfflineEarnedSkillPoints", 0x850b, {}],
  ["Skill.ReportDeprecatedSkillLine", 0x850c, {}],
  ["Loadout.LoadLoadoutDefinitionManager", 0x8601, {}],
  ["Loadout.SelectLoadout", 0x8602, {}],
  [
    "Loadout.SetCurrentLoadout",
    0x8603,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "loadoutId", type: "uint32" },
      ],
    },
  ],
  [
    "Loadout.SelectSlot",
    0x8604,
    {
      fields: [
        { name: "type", type: "uint8" },
        { name: "unknownByte1", type: "uint8" },
        { name: "unknownByte2", type: "uint8" },
        { name: "loadoutSlotId", type: "uint32" },
        { name: "gameTime", type: "uint32" },
      ],
    },
  ],
  ["Loadout.SelectClientSlot", 0x8605, {}],
  [
    "Loadout.SetCurrentSlot",
    0x8606,
    {
      fields: [
        { name: "type", type: "uint8" },
        { name: "unknownByte1", type: "uint8" },
        { name: "slotId", type: "uint32" },
      ],
    },
  ],
  ["Loadout.CreateCustomLoadout", 0x8607, {}],
  ["Loadout.SelectSlotItem", 0x8608, {}],
  ["Loadout.UnselectSlotItem", 0x8609, {}],
  ["Loadout.SelectSlotTintItem", 0x860a, {}],
  ["Loadout.UnselectSlotTintItem", 0x860b, {}],
  ["Loadout.SelectAllSlotTintItems", 0x860c, {}],
  ["Loadout.UnselectAllSlotTintItems", 0x860d, {}],
  ["Loadout.SelectBodyTintItem", 0x860e, {}],
  ["Loadout.UnselectBodyTintItem", 0x860f, {}],
  ["Loadout.SelectAllBodyTintItems", 0x8610, {}],
  ["Loadout.UnselectAllBodyTintItems", 0x8611, {}],
  ["Loadout.SelectGuildTintItem", 0x8612, {}],
  ["Loadout.UnselectGuildTintItem", 0x8613, {}],
  ["Loadout.SelectDecalItem", 0x8614, {}],
  ["Loadout.UnselectDecalItem", 0x8615, {}],
  ["Loadout.SelectAttachmentItem", 0x8616, {}],
  ["Loadout.UnselectAttachmentItem", 0x8617, {}],
  ["Loadout.SelectCustomName", 0x8618, {}],
  ["Loadout.ActivateLoadoutTerminal", 0x8619, {}],
  [
    "Loadout.ActivateVehicleLoadoutTerminal",
    0x861a,
    {
      fields: [
        { name: "type", type: "uint8" },
        { name: "guid", type: "uint64" },
      ],
    },
  ],
  [
    "Loadout.SetLoadouts",
    0x861b,
    {
      fields: [
        { name: "type", type: "uint8" },
        { name: "guid", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
      ],
    },
  ],
  ["Loadout.AddLoadout", 0x861c, {}],
  ["Loadout.UpdateCurrentLoadout", 0x861d, {}],
  ["Loadout.UpdateLoadoutSlot", 0x861e, {}],
  ["Loadout.SetVehicleLoadouts", 0x861f, {}],
  ["Loadout.AddVehicleLoadout", 0x8620, {}],
  ["Loadout.ClearCurrentVehicleLoadout", 0x8621, {}],
  ["Loadout.UpdateVehicleLoadoutSlot", 0x8622, {}],
  ["Loadout.SetSlotTintItem", 0x8623, {}],
  ["Loadout.UnsetSlotTintItem", 0x8624, {}],
  ["Loadout.SetBodyTintItem", 0x8625, {}],
  ["Loadout.UnsetBodyTintItem", 0x8626, {}],
  ["Loadout.SetGuildTintItem", 0x8627, {}],
  ["Loadout.UnsetGuildTintItem", 0x8628, {}],
  ["Loadout.SetDecalItem", 0x8629, {}],
  ["Loadout.UnsetDecalItem", 0x862a, {}],
  ["Loadout.SetCustomName", 0x862b, {}],
  ["Loadout.UnsetCustomName", 0x862c, {}],
  ["Loadout.UpdateLoadoutSlotItemLineConfig", 0x862d, {}],
  ["Experience.SetExperience", 0x8701, {}],
  [
    "Experience.SetExperienceRanks",
    0x8702,
    {
      fields: [
        {
          name: "experienceRanks",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            {
              name: "experienceRankData",
              type: "array",
              fields: [
                { name: "experienceRequired", type: "uint32" },
                {
                  name: "factionRanks",
                  type: "array",
                  length: 4,
                  fields: [
                    { name: "nameId", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "imageSetId", type: "uint32" },
                    {
                      name: "rewards",
                      type: "array",
                      fields: [
                        { name: "itemId", type: "uint32" },
                        { name: "nameId", type: "uint32" },
                        { name: "imageSetId", type: "uint32" },
                        { name: "itemCountMin", type: "uint32" },
                        { name: "itemCountMax", type: "uint32" },
                        { name: "itemType", type: "uint32" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  [
    "Experience.SetExperienceRateTier",
    0x8703,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownDword2", type: "uint32" },
        { name: "unknownDword3", type: "uint32" },
        { name: "unknownDword4", type: "uint32" },
        { name: "unknownDword5", type: "uint32" },
      ],
    },
  ],
  [
    "Vehicle.Owner",
    0x8801,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "characterId", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "vehicleId", type: "uint32" },
        {
          name: "passengers",
          type: "array",
          fields: [
            {
              name: "passengerData",
              type: "schema",
              fields: [
                { name: "characterId", type: "uint64" },
                {
                  name: "characterData",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "characterName", type: "string" },
                    { name: "unknownString1", type: "string" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownString1", type: "string" },
              ],
            },
            { name: "unknownByte1", type: "uint8" },
          ],
        },
      ],
    },
  ],
  [
    "Vehicle.Occupy",
    0x8802,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "characterId", type: "uint64" },
        { name: "vehicleId", type: "uint32" },
        { name: "unknownDword1", type: "uint32" },
        {
          name: "unknownArray1",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownBoolean1", type: "boolean" },
          ],
        },
        {
          name: "passengers",
          type: "array",
          fields: [
            {
              name: "passengerData",
              type: "schema",
              fields: [
                { name: "characterId", type: "uint64" },
                {
                  name: "characterData",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                    { name: "characterName", type: "string" },
                    { name: "unknownString1", type: "string" },
                  ],
                },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownString1", type: "string" },
              ],
            },
            { name: "unknownByte1", type: "uint8" },
          ],
        },
        {
          name: "unknownArray2",
          type: "array",
          fields: [{ name: "unknownQword1", type: "uint64" }],
        },
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            {
              name: "unknownData1",
              type: "schema",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownByte1", type: "uint8" },
              ],
            },
            { name: "unknownString1", type: "string" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword5", type: "uint32" },
            {
              name: "unknownArray3",
              type: "array",
              fields: [
                { name: "unknownDword1", type: "uint32" },
                {
                  name: "unknownData1",
                  type: "schema",
                  fields: [
                    { name: "unknownDword1", type: "uint32" },
                    {
                      name: "unknownData1",
                      type: "schema",
                      fields: [
                        { name: "unknownDword1", type: "uint32" },
                        { name: "unknownByte1", type: "uint8" },
                        {
                          name: "unknownArray1",
                          type: "array",
                          fields: [{ name: "unknownDword1", type: "uint32" }],
                        },
                        {
                          name: "unknownArray2",
                          type: "array",
                          fields: [
                            { name: "unknownDword1", type: "uint32" },
                            { name: "unknownDword2", type: "uint32" },
                          ],
                        },
                      ],
                    },
                    { name: "unknownDword2", type: "uint32" },
                    { name: "unknownDword3", type: "uint32" },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "unknownBytes1",
          type: "byteswithlength",
          defaultValue: null,
          fields: [
            {
              name: "itemData",
              type: "custom",
              parser: parseItemData,
              packer: packItemData,
            },
          ],
        },
        { name: "unknownBytes2", type: "byteswithlength", defaultValue: null },
      ],
    },
  ],
  [
    "Vehicle.StateData",
    0x8803,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknown3", type: "float" },
        {
          name: "unknown4",
          type: "array",
          fields: [
            { name: "unknown1", type: "uint32" },
            { name: "unknown2", type: "uint8" },
          ],
        },
        {
          name: "unknown5",
          type: "array",
          fields: [
            { name: "unknown1", type: "uint32" },
            { name: "unknown2", type: "uint8" },
          ],
        },
      ],
    },
  ],
  ["Vehicle.StateDamage", 0x8804, {}],
  ["Vehicle.PlayerManager", 0x8805, {}],
  [
    "Vehicle.Spawn",
    0x8806,
    {
      fields: [
        { name: "vehicleId", type: "uint32" },
        { name: "loadoutTab", type: "uint32" },
      ],
    },
  ],
  ["Vehicle.Tint", 0x8807, {}],
  ["Vehicle.LoadVehicleTerminalDefinitionManager", 0x8808, {}],
  ["Vehicle.ActiveWeapon", 0x8809, {}],
  ["Vehicle.Stats", 0x880a, {}],
  ["Vehicle.DamageInfo", 0x880b, {}],
  ["Vehicle.StatUpdate", 0x880c, {}],
  ["Vehicle.UpdateWeapon", 0x880d, {}],
  ["Vehicle.RemovedFromQueue", 0x880e, {}],
  [
    "Vehicle.UpdateQueuePosition",
    0x880f,
    {
      fields: [{ name: "queuePosition", type: "uint32" }],
    },
  ],
  ["Vehicle.PadDestroyNotify", 0x8810, {}],
  [
    "Vehicle.SetAutoDrive",
    0x8811,
    {
      fields: [{ name: "guid", type: "uint64" }],
    },
  ],
  ["Vehicle.LockOnInfo", 0x8812, {}],
  ["Vehicle.LockOnState", 0x8813, {}],
  ["Vehicle.TrackingState", 0x8814, {}],
  ["Vehicle.CounterMeasureState", 0x8815, {}],
  [
    "Vehicle.LoadVehicleDefinitionManager",
    0x8816,
    {
      fields: [
        {
          name: "vehicleDefinitions",
          type: "array",
          fields: [
            { name: "vehicleId", type: "uint32" },
            { name: "modelId", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["Vehicle.AcquireState", 0x8817, {}],
  ["Vehicle.Dismiss", 0x8818, {}],
  [
    "Vehicle.AutoMount",
    0x8819,
    {
      fields: [
        { name: "guid", type: "uint64" },
        { name: "unknownBoolean1", type: "boolean" },
        { name: "unknownDword1", type: "uint32" },
      ],
    },
  ],
  ["Vehicle.Deploy", 0x881a, {}],
  ["Vehicle.Engine", 0x881b, {}],
  ["Vehicle.AccessType", 0x881c, {}],
  ["Vehicle.KickPlayer", 0x881d, {}],
  ["Vehicle.HealthUpdateOwner", 0x881e, {}],
  ["Vehicle.OwnerPassengerList", 0x881f, {}],
  ["Vehicle.Kick", 0x8820, {}],
  ["Vehicle.NoAccess", 0x8821, {}],
  [
    "Vehicle.Expiration",
    0x8822,
    {
      fields: [{ name: "expireTime", type: "uint32" }],
    },
  ],
  ["Vehicle.Group", 0x8823, {}],
  ["Vehicle.DeployResponse", 0x8824, {}],
  ["Vehicle.ExitPoints", 0x8825, {}],
  ["Vehicle.ControllerLogOut", 0x8826, {}],
  ["Vehicle.CurrentMoveMode", 0x8827, {}],
  ["Vehicle.ItemDefinitionRequest", 0x8828, {}],
  ["Vehicle.ItemDefinitionReply", 0x8829, {}],
  ["Vehicle.InventoryItems", 0x882a, {}],
  ["Grief", 0x89, {}],
  ["SpotPlayer", 0x8a, {}],
  ["Faction", 0x8b, {}],
  [
    "Synchronization",
    0x8c,
    {
      fields: [
        { name: "time1", type: "uint64" },
        { name: "time2", type: "uint64" },
        { name: "clientTime", type: "uint64" },
        { name: "serverTime", type: "uint64" },
        { name: "serverTime2", type: "uint64" },
        { name: "time3", type: "uint64" },
      ],
    },
  ],
  [
    "ResourceEvent",
    0x8d00,
    {
      fields: [
        { name: "gameTime", type: "uint32" },
        {
          name: "eventData",
          type: "variabletype8",
          types: {
            1: [
              // SetCharacterResources
              { name: "characterId", type: "uint64" },
              {
                name: "unknownArray1",
                type: "array",
                fields: [
                  { name: "unknownDword1", type: "uint32" },
                  {
                    name: "unknownData1",
                    type: "schema",
                    fields: resourceEventDataSubSchema,
                  },
                ],
              },
            ],
            2: [
              // SetCharacterResource
              { name: "characterId", type: "uint64" },
              { name: "unknownDword1", type: "uint32" },
              { name: "unknownDword2", type: "uint32" },
              {
                name: "unknownArray1",
                type: "array",
                fields: [
                  { name: "unknownDword1", type: "float" },
                  { name: "unknownDword2", type: "float" },
                  { name: "unknownDword3", type: "float" },
                  { name: "unknownDword4", type: "float" },
                ],
              },
              { name: "unknownDword3", type: "uint32" },
              { name: "unknownDword4", type: "uint32" },
              { name: "unknownFloat5", type: "float" },
              { name: "unknownFloat6", type: "float" },
              { name: "unknownFloat7", type: "float" },
              { name: "unknownDword8", type: "uint32" },
              { name: "unknownDword9", type: "uint32" },
              { name: "unknownDword10", type: "uint32" },

              { name: "unknownByte1", type: "uint8" },
              { name: "unknownByte2", type: "uint8" },
              { name: "unknownGuid3", type: "uint64" },
              { name: "unknownGuid4", type: "uint64" },
              { name: "unknownGuid5", type: "uint64" },
            ],
            3: [
              // UpdateCharacterResource
              { name: "characterId", type: "uint64" },
              { name: "unknownDword1", type: "uint32" },
              { name: "unknownDword2", type: "uint32" },

              { name: "unknownDword3", type: "uint32" },
              { name: "unknownDword4", type: "uint32" },
              { name: "unknownFloat5", type: "float" },
              { name: "unknownFloat6", type: "float" },
              { name: "unknownFloat7", type: "float" },
              { name: "unknownDword8", type: "uint32" },
              { name: "unknownDword9", type: "uint32" },
              { name: "unknownDword10", type: "uint32" },

              { name: "unknownByte1", type: "uint8" },
              { name: "unknownByte2", type: "uint8" },
              { name: "unknownGuid3", type: "uint64" },
              { name: "unknownGuid4", type: "uint64" },
              { name: "unknownGuid5", type: "uint64" },

              { name: "unknownBoolean", type: "boolean" },
            ],
            4: [
              // RemoveCharacterResource
            ],
          },
        },
      ],
    },
  ],
  ["Collision.Damage", 0x8e01, {}],
  ["Leaderboard", 0x8f, {}],
  ["PlayerUpdateManagedPosition", 0x90, {}],
  ["PlayerUpdateNetworkObjectComponents", 0x91, {}],
  ["PlayerUpdateUpdateVehicleWeapon", 0x92, {}],
  [
    "ProfileStats.GetPlayerProfileStats",
    0x930000,
    {
      fields: [{ name: "characterId", type: "uint64" }],
    },
  ],
  ["ProfileStats.GetZonePlayerProfileStats", 0x930100, {}],
  [
    "ProfileStats.PlayerProfileStats",
    0x930200,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            {
              name: "unknownData1",
              type: "schema",
              fields: profileStatsSubSchema1,
            },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownArray1", type: "array", elementType: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "characterName", type: "string" },
            { name: "characterId", type: "uint64" },
            { name: "battleRank", type: "uint32" },
            { name: "unknownDword4", type: "uint32" },
            { name: "unknownDword6", type: "uint32" },
            { name: "unknownDword7", type: "uint32" },
            { name: "unknownByte1", type: "uint8" },
            { name: "unknownArray2", type: "array", elementType: "uint32" },
            { name: "unknownDword8", type: "uint32" },
            { name: "unknownDword9", type: "uint32" },
            { name: "unknownDword10", type: "uint32" },
            { name: "unknownDword11", type: "uint32" },
            { name: "unknownDword12", type: "uint32" },
            { name: "unknownArray3", type: "array", elementType: "uint32" },
            { name: "unknownDword13", type: "uint32" },
            { name: "unknownArray4", type: "array", elementType: "uint32" },
            {
              name: "unknownArray5",
              type: "array",
              length: 10,
              fields: [
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownArray1", type: "array", elementType: "uint32" },
                { name: "unknownArray2", type: "array", elementType: "uint32" },
                { name: "unknownArray3", type: "array", elementType: "uint32" },
              ],
            },
          ],
        },
        { name: "weaponStats1", type: "array", fields: weaponStatsDataSchema },
        { name: "weaponStats2", type: "array", fields: weaponStatsDataSchema },
        { name: "vehicleStats", type: "array", fields: vehicleStatsDataSchema },
        {
          name: "facilityStats1",
          type: "array",
          fields: facilityStatsDataSchema,
        },
        {
          name: "facilityStats2",
          type: "array",
          fields: facilityStatsDataSchema,
        },
      ],
    },
  ],
  ["ProfileStats.ZonePlayerProfileStats", 0x930300, {}],
  ["ProfileStats.UpdatePlayerLeaderboards", 0x930400, {}],
  ["ProfileStats.UpdatePlayerLeaderboardsReply", 0x930500, {}],
  ["ProfileStats.GetLeaderboard", 0x930600, {}],
  ["ProfileStats.Leaderboard", 0x930700, {}],
  ["ProfileStats.GetZoneCharacterStats", 0x930800, {}],
  ["ProfileStats.ZoneCharacterStats", 0x930900, {}],
  [
    "Equipment.SetCharacterEquipment",
    0x9401,
    {
      fields: [
        { name: "profileId", type: "uint32" },
        { name: "characterId", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownString1", type: "string" },
        { name: "unknownString2", type: "string" },
        {
          name: "equipmentSlots",
          type: "array",
          fields: [
            { name: "equipmentSlotId", type: "uint32" },
            {
              name: "equipmentSlotData",
              type: "schema",
              fields: [
                { name: "equipmentSlotId", type: "uint32" },
                { name: "guid", type: "uint64" },
                { name: "unknownString1", type: "string" },
                { name: "unknownString2", type: "string" },
              ],
            },
          ],
        },
        {
          name: "attachmentData",
          type: "array",
          fields: [
            { name: "modelName", type: "string" },
            { name: "unknownString1", type: "string" },
            { name: "tintAlias", type: "string" },
            { name: "unknownString2", type: "string" },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "slotId", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["Equipment.SetCharacterEquipmentSlot", 0x9402, {}],
  ["Equipment.UnsetCharacterEquipmentSlot", 0x9403, {}],
  [
    "Equipment.SetCharacterEquipmentSlots",
    0x9404,
    {
      fields: [
        { name: "profileId", type: "uint32" },
        { name: "characterId", type: "uint64" },
        { name: "gameTime", type: "uint32" },
        {
          name: "slots",
          type: "array",
          fields: [
            { name: "index", type: "uint32" },
            { name: "slotId", type: "uint32" },
          ],
        },
        { name: "unknown1", type: "uint32" },
        { name: "unknown2", type: "uint32" },
        { name: "unknown3", type: "uint32" },
        {
          name: "textures",
          type: "array",
          fields: [
            { name: "index", type: "uint32" },
            { name: "slotId", type: "uint32" },
            { name: "itemId", type: "uint32" },
            { name: "unknown1", type: "uint32" },
            { name: "textureAlias", type: "string" },
            { name: "unknown2", type: "string" },
          ],
        },
        {
          name: "models",
          type: "array",
          fields: [
            { name: "modelName", type: "string" },
            { name: "unknown1", type: "string" },
            { name: "textureAlias", type: "string" },
            { name: "unknown3", type: "string" },
            { name: "unknown4", type: "uint32" },
            { name: "unknown5", type: "uint32" },
            { name: "slotId", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["DefinitionFilter.ListDefinitionVariables", 0x9501, {}],
  [
    "DefinitionFilter.SetDefinitionVariable",
    0x9502,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownQword1", type: "uint64" },
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            { name: "unknownFloat1", type: "float" },
            { name: "unknownFloat2", type: "float" },
          ],
        },
      ],
    },
  ],
  [
    "DefinitionFilter.SetDefinitionIntSet",
    0x9503,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownQword1", type: "uint64" },
        {
          name: "unknownData1",
          type: "array",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
          ],
        },
      ],
    },
  ],
  [
    "DefinitionFilter.UnknownWithVariable1",
    0x9504,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownQword1", type: "uint64" },
      ],
    },
  ],
  [
    "DefinitionFilter.UnknownWithVariable2",
    0x9505,
    {
      fields: [
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownQword1", type: "uint64" },
      ],
    },
  ],
  [
    "ContinentBattleInfo",
    0x96,
    {
      fields: [
        {
          name: "zones",
          type: "array",
          fields: [
            { name: "id", type: "uint32" },
            { name: "nameId", type: "uint32" },
            { name: "descriptionId", type: "uint32" },
            { name: "population", type: "array", elementType: "uint8" },
            { name: "regionPercent", type: "array", elementType: "uint8" },
            { name: "populationBuff", type: "array", elementType: "uint8" },
            {
              name: "populationTargetPercent",
              type: "array",
              elementType: "uint8",
            },
            { name: "name", type: "string" },
            { name: "hexSize", type: "float" },
            { name: "isProductionZone", type: "uint8" },
          ],
        },
      ],
    },
  ],
  [
    "GetContinentBattleInfo",
    0x97,
    {
      fields: [],
    },
  ],
  [
    "GetRespawnLocations",
    0x98,
    {
      fields: [],
    },
  ],
  ["WallOfData.PlayerKeyboard", 0x9903, {}],
  [
    "WallOfData.UIEvent",
    0x9905,
    {
      fields: [
        { name: "object", type: "string" },
        { name: "function", type: "string" },
        { name: "argument", type: "string" },
      ],
    },
  ],
  ["WallOfData.ClientSystemInfo", 0x9906, {}],
  ["WallOfData.VoiceChatEvent", 0x9907, {}],
  ["WallOfData.NudgeEvent", 0x9909, {}],
  ["WallOfData.LaunchPadFingerprint", 0x990a, {}],
  ["WallOfData.VideoCapture", 0x990b, {}],
  [
    "WallOfData.ClientTransition",
    0x990c,
    {
      fields: [
        { name: "oldState", type: "uint32" },
        { name: "newState", type: "uint32" },
        { name: "msElapsed", type: "uint32" },
      ],
    },
  ],
  ["ThrustPad.Data", 0x9a01, {}],
  ["ThrustPad.Update", 0x9a02, {}],
  ["ThrustPad.PlayerEntered", 0x9a03, {}],
  ["Implant.SelectImplant", 0x9b01, {}],
  ["Implant.UnselectImplant", 0x9b02, {}],
  ["Implant.LoadImplantDefinitionManager", 0x9b03, {}],
  ["Implant.SetImplants", 0x9b04, {}],
  ["Implant.UpdateImplantSlot", 0x9b05, {}],
  ["ClientInGamePurchase", 0x9c, {}],
  ["Missions.ListMissions", 0x9d01, {}],
  ["Missions.ConquerZone", 0x9d02, {}],
  ["Missions.SelectMission", 0x9d03, {}],
  ["Missions.UnselectMission", 0x9d04, {}],
  ["Missions.SetMissionInstanceManager", 0x9d05, {}],
  ["Missions.SetMissionManager", 0x9d06, {}],
  ["Missions.AddGlobalAvailableMission", 0x9d07, {}],
  ["Missions.RemoveGlobalAvailableMission", 0x9d08, {}],
  ["Missions.AddAvailableMission", 0x9d09, {}],
  ["Missions.RemoveAvailableMission", 0x9d0a, {}],
  ["Missions.AddActiveMission", 0x9d0b, {}],
  ["Missions.RemoveActiveMission", 0x9d0c, {}],
  ["Missions.ReportCompletedMission", 0x9d0d, {}],
  ["Missions.AddAvailableMissions", 0x9d0e, {}],
  ["Missions.SetMissionChangeList", 0x9d0f, {}],
  ["Missions.SetConqueredZone", 0x9d10, {}],
  ["Missions.UnsetConqueredZone", 0x9d11, {}],
  ["Missions.SetConqueredZones", 0x9d12, {}],
  [
    "Effect.AddEffect",
    0x9e01,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
          ],
        },
        {
          name: "unknownData2",
          type: "schema",
          fields: [
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownQword2", type: "uint64" },
          ],
        },
        {
          name: "unknownData3",
          type: "schema",
          fields: [
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownQword2", type: "uint64" },
            { name: "unknownVector1", type: "floatvector4" },
          ],
        },
      ],
    },
  ],
  [
    "Effect.UpdateEffect",
    0x9e02,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
          ],
        },
        {
          name: "unknownData2",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownQword1", type: "uint64" },
          ],
        },
        {
          name: "unknownData3",
          type: "schema",
          fields: [
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownQword2", type: "uint64" },
            { name: "unknownVector1", type: "floatvector4" },
          ],
        },
      ],
    },
  ],
  [
    "Effect.RemoveEffect",
    0x9e03,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownDword2", type: "uint32" },
            { name: "unknownDword3", type: "uint32" },
          ],
        },
        {
          name: "unknownData2",
          type: "schema",
          fields: [{ name: "unknownQword1", type: "uint64" }],
        },
        {
          name: "unknownData3",
          type: "schema",
          fields: [
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownQword2", type: "uint64" },
            { name: "unknownVector1", type: "floatvector4" },
          ],
        },
      ],
    },
  ],
  [
    "Effect.AddEffectTag",
    0x9e04,
    {
      fields: effectTagDataSchema,
    },
  ],
  [
    "Effect.RemoveEffectTag",
    0x9e05,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [{ name: "unknownQword1", type: "uint64" }],
        },
        {
          name: "unknownData2",
          type: "schema",
          fields: [
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownQword1", type: "uint64" },
            { name: "unknownQword2", type: "uint64" },
          ],
        },
      ],
    },
  ],
  [
    "Effect.TargetBlockedEffect",
    0x9e06,
    {
      fields: [
        {
          name: "unknownData1",
          type: "schema",
          fields: [{ name: "unknownQword1", type: "uint64" }],
        },
      ],
    },
  ],
  ["RewardBuffs.ReceivedBundlePacket", 0x9f01, {}],
  ["RewardBuffs.NonBundledItem", 0x9f02, {}],
  ["RewardBuffs.AddBonus", 0x9f03, {}],
  ["RewardBuffs.RemoveBonus", 0x9f04, {}],
  ["RewardBuffs.GiveRewardToPlayer", 0x9f05, {}],
  ["Abilities.InitAbility", 0xa001, {}],
  ["Abilities.UpdateAbility", 0xa002, {}],
  ["Abilities.UninitAbility", 0xa003, {}],
  ["Abilities.SetAbilityActivationManager", 0xa004, {}],
  [
    "Abilities.SetActivatableAbilityManager",
    0xa005,
    {
      fields: [
        {
          name: "unknownArray1",
          type: "array",
          fields: [
            { name: "unknownQword1", type: "uint64" },
            {
              name: "unknownData1",
              type: "schema",
              fields: [
                { name: "unknownQword1", type: "uint64" },
                { name: "unknownDword1", type: "uint32" },
                { name: "unknownDword2", type: "uint32" },
              ],
            },
            { name: "unknownDword1", type: "uint32" },
            { name: "unknownByte1", type: "uint8" },
          ],
        },
      ],
    },
  ],
  ["Abilities.SetVehicleActivatableAbilityManager", 0xa006, {}],
  ["Abilities.SetAbilityTimerManager", 0xa007, {}],
  ["Abilities.AddAbilityTimer", 0xa008, {}],
  ["Abilities.RemoveAbilityTimer", 0xa009, {}],
  ["Abilities.UpdateAbilityTimer", 0xa00a, {}],
  ["Abilities.SetAbilityLockTimer", 0xa00b, {}],
  ["Abilities.ActivateAbility", 0xa00c, {}],
  ["Abilities.VehicleActivateAbility", 0xa00d, {}],
  ["Abilities.DeactivateAbility", 0xa00e, {}],
  ["Abilities.VehicleDeactivateAbility", 0xa00f, {}],
  ["Abilities.ActivateAbilityFailed", 0xa010, {}],
  ["Abilities.VehicleActivateAbilityFailed", 0xa011, {}],
  ["Abilities.ClearAbilityLineManager", 0xa012, {}],
  ["Abilities.SetAbilityLineManager", 0xa013, {}],
  ["Abilities.SetProfileAbilityLineMembers", 0xa014, {}],
  ["Abilities.SetProfileAbilityLineMember", 0xa015, {}],
  ["Abilities.RemoveProfileAbilityLineMember", 0xa016, {}],
  ["Abilities.SetVehicleAbilityLineMembers", 0xa017, {}],
  ["Abilities.SetVehicleAbilityLineMember", 0xa018, {}],
  ["Abilities.RemoveVehicleAbilityLineMember", 0xa019, {}],
  ["Abilities.SetFacilityAbilityLineMembers", 0xa01a, {}],
  ["Abilities.SetFacilityAbilityLineMember", 0xa01b, {}],
  ["Abilities.RemoveFacilityAbilityLineMember", 0xa01c, {}],
  ["Abilities.SetEmpireAbilityLineMembers", 0xa01d, {}],
  ["Abilities.SetEmpireAbilityLineMember", 0xa01e, {}],
  ["Abilities.RemoveEmpireAbilityLineMember", 0xa01f, {}],
  [
    "Abilities.SetLoadoutAbilities",
    0xa020,
    {
      fields: [
        {
          name: "abilities",
          type: "array",
          fields: [
            { name: "abilitySlotId", type: "uint32" },
            {
              name: "abilityData",
              type: "schema",
              fields: [
                { name: "abilitySlotId", type: "uint32" },
                { name: "abilityId", type: "uint32" },
                { name: "unknownDword1", type: "uint32" },
                { name: "guid1", type: "uint64" },
                { name: "guid2", type: "uint64" },
              ],
            },
          ],
        },
      ],
    },
  ],
  ["Abilities.AddLoadoutAbility", 0xa021, {}],
  ["Abilities.RemoveLoadoutAbility", 0xa022, {}],
  ["Abilities.SetImplantAbilities", 0xa023, {}],
  ["Abilities.AddImplantAbility", 0xa024, {}],
  ["Abilities.RemoveImplantAbility", 0xa025, {}],
  ["Abilities.SetPersistentAbilities", 0xa026, {}],
  ["Abilities.AddPersistentAbility", 0xa027, {}],
  ["Abilities.RemovePersistentAbility", 0xa028, {}],
  ["Abilities.SetProfileRankAbilities", 0xa029, {}],
  ["Abilities.AddProfileRankAbility", 0xa02a, {}],
  ["Abilities.RemoveProfileRankAbility", 0xa02b, {}],
  ["Deployable.Place", 0xa101, {}],
  ["Deployable.Remove", 0xa102, {}],
  ["Deployable.Pickup", 0xa103, {}],
  ["Deployable.ActionResponse", 0xa104, {}],
  [
    "Security",
    0xa2,
    {
      fields: [{ name: "code", type: "uint32" }],
    },
  ],
  [
    "MapRegion.GlobalData",
    0xa301,
    {
      fields: [
        { name: "unknown1", type: "float" },
        { name: "unknown2", type: "float" },
      ],
    },
  ],
  [
    "MapRegion.Data",
    0xa302,
    {
      fields: [
        { name: "unknown1", type: "float" },
        { name: "unknown2", type: "uint32" },
        {
          name: "regions",
          type: "array",
          fields: [
            { name: "regionId", type: "uint32" },
            { name: "regionId2", type: "uint32" },
            { name: "nameId", type: "uint32" },
            { name: "facilityId", type: "uint32" },
            { name: "facilityType", type: "uint8" },
            { name: "currencyId", type: "uint8" },
            { name: "ownerFactionId", type: "uint8" },
            {
              name: "hexes",
              type: "array",
              fields: [
                { name: "x", type: "int32" },
                { name: "y", type: "int32" },
                { name: "type", type: "uint32" },
              ],
            },
            { name: "flags", type: "uint8" },
            { name: "unknown4", type: "array", elementType: "uint8" },
            { name: "unknown5", type: "array", elementType: "uint8" },
            { name: "unknown6", type: "array", elementType: "uint8" },
            { name: "connectionFacilityId", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["MapRegion.ExternalData", 0xa303, {}],
  ["MapRegion.Update", 0xa304, {}],
  ["MapRegion.UpdateAll", 0xa305, {}],
  [
    "MapRegion.MapOutOfBounds",
    0xa306,
    {
      fields: [
        { name: "characterId", type: "uint64" },
        { name: "unknownDword1", type: "uint32" },
        { name: "unknownByte2", type: "uint8" },
      ],
    },
  ],
  ["MapRegion.Population", 0xa307, {}],
  [
    "MapRegion.RequestContinentData",
    0xa308,
    {
      fields: [{ name: "zoneId", type: "uint32" }],
    },
  ],
  ["MapRegion.InfoRequest", 0xa309, {}],
  ["MapRegion.InfoReply", 0xa30a, {}],
  ["MapRegion.ExternalFacilityData", 0xa30b, {}],
  ["MapRegion.ExternalFacilityUpdate", 0xa30c, {}],
  ["MapRegion.ExternalFacilityUpdateAll", 0xa30d, {}],
  ["MapRegion.ExternalFacilityEmpireScoreUpdate", 0xa30e, {}],
  ["MapRegion.NextTick", 0xa30f, {}],
  ["MapRegion.HexActivityUpdate", 0xa310, {}],
  ["MapRegion.ConquerFactionUpdate", 0xa311, {}],
  ["Hud", 0xa4, {}],
  ["ClientPcData.SetSpeechPack", 0xa501, {}],
  [
    "ClientPcData.SpeechPackList",
    0xa503,
    {
      fields: [
        {
          name: "speechPacks",
          type: "array",
          fields: [{ name: "speechPackId", type: "uint32" }],
        },
      ],
    },
  ],
  ["AcquireTimer", 0xa6, {}],
  ["PlayerUpdateGuildTag", 0xa7, {}],
  ["Warpgate.ActivateTerminal", 0xa801, {}],
  ["Warpgate.ZoneRequest", 0xa802, {}],
  ["Warpgate.PostQueueNotify", 0xa803, {}],
  ["Warpgate.QueueForZone", 0xa804, {}],
  ["Warpgate.CancelQueue", 0xa805, {}],
  ["Warpgate.WarpToQueuedZone", 0xa806, {}],
  ["Warpgate.WarpToSocialZone", 0xa807, {}],
  ["LoginQueueStatus", 0xa9, {}],
  [
    "ServerPopulationInfo",
    0xaa,
    {
      fields: [
        { name: "population", type: "array", elementType: "uint16" },
        { name: "populationPercent", type: "array", elementType: "uint8" },
        { name: "populationBuff", type: "array", elementType: "uint8" },
      ],
    },
  ],
  [
    "GetServerPopulationInfo",
    0xab,
    {
      fields: [],
    },
  ],
  ["PlayerUpdate.VehicleCollision", 0xac, {}],
  [
    "PlayerUpdate.Stop",
    0xad,
    {
      fields: [
        {
          name: "unknownUint",
          type: "custom",
          parser: readUnsignedIntWith2bitLengthValue,
          packer: packUnsignedIntWith2bitLengthValue,
        },
      ],
    },
  ],
  [
    "Currency.SetCurrencyDiscount",
    0xae01,
    {
      fields: [
        { name: "currencyId", type: "uint32" },
        { name: "discount", type: "float" },
      ],
    },
  ],
  ["Currency.SetCurrencyRateTier", 0xae02, {}],
  ["Items.LoadItemRentalDefinitionManager", 0xaf01, {}],
  ["Items.SetItemTimerManager", 0xaf02, {}],
  ["Items.SetItemLockTimer", 0xaf03, {}],
  ["Items.SetItemTimers", 0xaf04, {}],
  ["Items.SetItemTrialLockTimer", 0xaf05, {}],
  ["Items.SetItemTrialTimers", 0xaf06, {}],
  ["Items.AddItemTrialTimer", 0xaf07, {}],
  ["Items.RemoveItemTrialTimer", 0xaf08, {}],
  ["Items.ExpireItemTrialTimer", 0xaf09, {}],
  ["Items.UpdateItemTrialTimer", 0xaf0a, {}],
  ["Items.SetItemRentalTimers", 0xaf0b, {}],
  ["Items.AddItemRentalTimer", 0xaf0c, {}],
  ["Items.RemoveItemRentalTimer", 0xaf0d, {}],
  ["Items.ExpireItemRentalTimer", 0xaf0e, {}],
  ["Items.SetAccountItemManager", 0xaf0f, {}],
  ["Items.AddAccountItem", 0xaf10, {}],
  ["Items.RemoveAccountItem", 0xaf11, {}],
  ["Items.UpdateAccountItem", 0xaf12, {}],
  ["Items.RequestAddItemTimer", 0xaf13, {}],
  ["Items.RequestTrialItem", 0xaf14, {}],
  ["Items.RequestRentalItem", 0xaf15, {}],
  ["Items.RequestUseItem", 0xaf16, {}],
  ["Items.RequestUseAccountItem", 0xaf17, {}],

  ["PlayerUpdate.AttachObject", 0xb0, {}],
  ["PlayerUpdate.DetachObject", 0xb1, {}],
  [
    "ClientSettings",
    0xb2,
    {
      fields: [
        { name: "helpUrl", type: "string" },
        { name: "shopUrl", type: "string" },
        { name: "shop2Url", type: "string" },
      ],
    },
  ],
  [
    "RewardBuffInfo",
    0xb3,
    {
      fields: [
        { name: "unknownFloat1", type: "float" },
        { name: "unknownFloat2", type: "float" },
        { name: "unknownFloat3", type: "float" },
        { name: "unknownFloat4", type: "float" },
        { name: "unknownFloat5", type: "float" },
        { name: "unknownFloat6", type: "float" },
        { name: "unknownFloat7", type: "float" },
        { name: "unknownFloat8", type: "float" },
        { name: "unknownFloat9", type: "float" },
        { name: "unknownFloat10", type: "float" },
        { name: "unknownFloat11", type: "float" },
        { name: "unknownFloat12", type: "float" },
      ],
    },
  ],
  [
    "GetRewardBuffInfo",
    0xb4,
    {
      fields: [],
    },
  ],
  ["Cais", 0xb5, {}],
  [
    "ZoneSetting.Data",
    0xb601,
    {
      fields: [
        {
          name: "settings",
          type: "array",
          fields: [
            { name: "hash", type: "uint32" },
            { name: "unknown1", type: "uint32", defaultValue: 0 },
            { name: "unknown2", type: "uint32", defaultValue: 0 },
            { name: "value", type: "uint32" },
            { name: "settingType", type: "uint32" },
          ],
        },
      ],
    },
  ],
  ["RequestPromoEligibilityUpdate", 0xb7, {}],
  ["PromoEligibilityReply", 0xb8, {}],
  ["MetaGameEvent.StartWarning", 0xb901, {}],
  ["MetaGameEvent.Start", 0xb902, {}],
  ["MetaGameEvent.Update", 0xb903, {}],
  ["MetaGameEvent.CompleteDominating", 0xb904, {}],
  ["MetaGameEvent.CompleteStandard", 0xb905, {}],
  ["MetaGameEvent.CompleteCancel", 0xb906, {}],
  ["MetaGameEvent.ExperienceBonusUpdate", 0xb907, {}],
  ["MetaGameEvent.ClearExperienceBonus", 0xb908, {}],
  ["RequestWalletTopupUpdate", 0xba, {}],
  ["RequestStationCashActivePromoUpdate", 0xbb, {}],
  ["CharacterSlot", 0xbc, {}],
  ["Operation.RequestCreate", 0xbf01, {}],
  ["Operation.RequestDestroy", 0xbf02, {}],
  ["Operation.RequestJoin", 0xbf03, {}],
  ["Operation.RequestJoinByName", 0xbf04, {}],
  ["Operation.RequestLeave", 0xbf05, {}],
  ["Operation.ClientJoined", 0xbf06, {}],
  ["Operation.ClientLeft", 0xbf07, {}],
  ["Operation.BecomeListener", 0xbf08, {}],
  ["Operation.AvailableData", 0xbf09, {}],
  ["Operation.Created", 0xbf0a, {}],
  ["Operation.Destroyed", 0xbf0b, {}],
  [
    "Operation.ClientClearMissions",
    0xbf0c,
    {
      fields: [],
    },
  ],
  ["Operation.InstanceAreaUpdate", 0xbf0d, {}],
  ["Operation.ClientInArea", 0xbf0e, {}],
  ["Operation.InstanceLocationUpdate", 0xbf0f, {}],
  ["Operation.GroupOperationListRequest", 0xbf10, {}],
  ["Operation.GroupOperationListReply", 0xbf11, {}],
  ["Operation.GroupOperationSelect", 0xbf12, {}],
  [
    "WordFilter.Data",
    0xc001,
    {
      fields: [{ name: "wordFilterData", type: "byteswithlength" }],
    },
  ],
  ["StaticFacilityInfo.Request", 0xc101, {}],
  ["StaticFacilityInfo.Reply", 0xc102, {}],
  [
    "StaticFacilityInfo.AllZones",
    0xc103,
    {
      fields: [
        {
          name: "facilities",
          type: "array",
          fields: [
            { name: "zoneId", type: "uint32" },
            { name: "facilityId", type: "uint32" },
            { name: "nameId", type: "uint32" },
            { name: "facilityType", type: "uint8" },
            { name: "locationX", type: "float" },
            { name: "locationY", type: "float" },
            { name: "locationZ", type: "float" },
          ],
        },
      ],
    },
  ],
  ["StaticFacilityInfo.ReplyWarpgate", 0xc104, {}],
  ["StaticFacilityInfo.AllWarpgateRespawns", 0xc105, {}],
  ["ProxiedPlayer", 0xc2, {}],
  ["Resist", 0xc3, {}],
  ["InGamePurchasing", 0xc4, {}],
  ["BusinessEnvironments", 0xc5, {}],
  ["EmpireScore", 0xc6, {}],
  [
    "CharacterSelectSessionRequest",
    0xc7,
    {
      fields: [],
    },
  ],
  [
    "CharacterSelectSessionResponse",
    0xc8,
    {
      fields: [
        { name: "status", type: "uint8" },
        { name: "sessionId", type: "string" },
      ],
    },
  ],
  ["Stats", 0xc9, {}],
  ["Resource", 0xca, {}],
  ["Construction", 0xcc, {}],
  ["SkyChanged", 0xcd, {}],
  ["NavGen", 0xce, {}],
  ["Locks", 0xcf, {}],
  ["Ragdoll", 0xd0, {}],
];

var packetTypes = {},
  packetDescriptors = {};

PacketTable.build(packets, packetTypes, packetDescriptors);

exports.PacketTypes = packetTypes;
exports.Packets = packetDescriptors;
