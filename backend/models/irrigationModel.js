import mongoose from "mongoose";
const irrigHistSchema= new mongoose.Schema({ //log of irrigation logic that supports manual and auto mode as per user 
    action: { type: String, 
        // enum: ["ON", "OFF"], 
        required: true 
    },
  source: { type: String, 
    enum: ["user", "system"], //checking if user or system 
    default: "user" 
},
  reason: { type: String, default: "" 
  },
  createdAt: { 
    type: Date, default: Date.now 
}
}, { _id: false });
const irrgSchema=new mongoose.Schema({
    status:{ //current state of valve
        type:String,
        enum:["ON", "OFF"],
        default:"OFF"
    },
    mode:{//irrigatoin logic working
        type:String, 
        enum:["AUTO", "MANUAL"],
        default:"MANUAL" //will change this later if changed to auto
    },
    threshold:{type:Number,default:40}, //as per the moisture lvl
    lastCmdAt:{type:Date}, //ui ft
    lastAppMoist:{type:Number, default:null},
    history:{type:[irrigHistSchema],default:[]},//all log ops action
},{timestamps:true,versionKey:false}
);
const irrigation=mongoose.model("irrigation",irrgSchema);
export default irrigation;