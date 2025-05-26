import Message from '../models/Message.js'
import Conversation from '../models/Conversation.js'
import User from '../models/User.js'
import AWS from 'aws-sdk'
import path from 'path'
import multer from 'multer'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
dotenv.config()
import { v4 as uuidv4 } from 'uuid'
import uploadDefaultAvatar from '../../util/uploadDefaultAvatar.js'
import { error } from 'console'
// require('dotenv').config()
import { io } from '../../index.js'
AWS.config.update({
    accessKeyId: process.env.ACCES_KEY,
    secretAccessKey: process.env.SECRET_ACCES_KEY,
    region: process.env.REGION,
})

const S3 = new AWS.S3()
const bucketname = process.env.S3_BUCKET
// console.log('bucketname nhận là : ', bucketname)

const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '')
    },
})


function checkFileType(file, callback) {
    const filetypes = /jpeg|jpg|png|jfif|gif|csv|docx|xlsx|txt|pdf|3gp/
    const extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
    )
    const mimetype = filetypes.test(file.mimetype)
    if (mimetype && extname) {
        return callback(null, true)
    } else {
        callback('Error: Invalid File Type 0!')
    }
}
function checkFileTypeMedia(file, callback) {
    const extTypes = /jpeg|jpg|png|gif|doc|docx|pdf|txt|ppt|pptx|xlsx|3gp|mp4/
    const mimeTypes = /image\/jpeg|image\/jpg|image\/png|image\/gif|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|application\/pdf|text\/plain|application\/vnd.ms-powerpoint|application\/vnd.openxmlformats-officedocument.presentationml.presentation|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet|video\/mp4|audio\/3gpp/

    const extname = extTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = mimeTypes.test(file.mimetype)

    if (mimetype && extname) {
        return callback(null, true)
    } else {
        callback('Error: Invalid File Type!')
    }
}
const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // giới hạn file 100MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb)
        checkFileTypeMedia(file, cb)
    },
})
class MessageController {
    async findAllMessages(req, res) {
        const messages = await Message.find()
        res.json(messages)
    }
    // gửi tin nhắn
    async createMessagesWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const senderId = req.body.user_id
        const content = req.body.content
        const contentType = req.body.contentType

        // thêm reply
        const replyTo = req.body.replyTo // new line

        // const image = req.file?.originalname.split('.')
        const image = req.files;
        console.log('bucketname nhận là : ', bucketname)
        console.log(
            'Các giá trị bên server lúc đầu  là: ',
            conversation_id,
            senderId,
            content,
            contentType,
            image,
            replyTo
        )

        // TH1 : Chỉ có gửi text message , không gửi ảnh
        if ((!image || image.length <= 0) && contentType === 'text') {
            // kiểm tra xem replyTo có tồn tại không nếu có thì tạo message mới với replyTo , còn nếu replyTo không tồn tại thì tạo message mới không có replyTo
            let message
            if (mongoose.Types.ObjectId.isValid(replyTo)) {
                console.log('Có reply')
                message = new Message({
                    conversation_id,
                    senderId,
                    content,
                    contentType,
                    replyTo, // new line
                })
            } else {
                console.log('No reply')
                message = new Message({
                    conversation_id,
                    senderId,
                    content,
                    contentType,
                })
            }

            await message
                .save()
                .then(() => {
                    console.log('Tạo tin nhắn TH1 thành công!!!')
                    return res.status(200).json({
                        thongbao: 'Tạo tin nhắn thành công!!!',
                        messages: message,
                    })
                })
                .catch((err) => {
                    console.error(err) // log lỗi
                    return res.status(200).json({
                        message: 'Lỗi khi tạo message!!!',
                        error: err.message, // thêm chi tiết lỗi
                    })
                })
        }
        // trường hợp 2 : chỉ gửi ảnh không gửi text message
        else if (image.length > 0 && contentType === 'image') {
            console.log('Đã vào trường hợp 2 ở server!!!')

            const uploadPromises = image.map((image) => {
                const imageParts = image.originalname.split('.')
                const fileType = imageParts[imageParts.length - 1]
                const filePath = `${uuidv4() + Date.now().toString()}.${fileType}`
                const params = {
                    Bucket: bucketname,
                    Key: filePath,
                    Body: image.buffer,
                    ContentType: image.mimetype,
                }

                return new Promise((resolve, reject) => {
                    S3.upload(params, async (err, data) => {
                        if (err) {
                            console.log('Lỗi khi tải ảnh lên S3!!!', err)
                            reject(err)
                        } else {
                            const ImageURL = data.Location
                            console.log(
                                'Các giá trị bên server ở TH2: ',
                                conversation_id,
                                senderId,
                                ImageURL,
                                contentType
                            )
                            // const message = new Message({
                            //     conversation_id,
                            //     senderId,
                            //     content: ImageURL,
                            //     contentType,
                            //     replyTo, // new line
                            // })
                            let message
                            if (mongoose.Types.ObjectId.isValid(replyTo)) {
                                console.log('Có reply')
                                message = new Message({
                                    conversation_id,
                                    senderId,
                                    content: ImageURL,
                                    contentType,
                                    replyTo, // new line
                                })
                            } else {
                                console.log('No reply')
                                message = new Message({
                                    conversation_id,
                                    senderId,
                                    content: ImageURL,
                                    contentType,
                                })
                            }
                            try {
                                await message.save()
                                console.log(
                                    'Tạo tin nhắn TH2 thành công trên db !!!'
                                )
                                resolve(message)
                            } catch (err) {
                                console.error(err) // log lỗi
                                reject(err)
                            }
                        }
                    })
                })
            })

            Promise.all(uploadPromises)
                .then((messages) => {
                    console.log('Tạo tin nhắn TH2 ở Promise thành công!!!')
                    // Gửi mảng các tin nhắn đã hoàn thành đến client
                    return res.status(200).json({
                        thongbao: 'Tạo tin nhắn thành công!!!',
                        messages: messages,
                    })
                })
                .catch((err) => {
                    return res.status(500).json({
                        message: 'Lỗi khi tạo message!!!',
                        error: err.message, // thêm chi tiết lỗi
                    })
                })
        }
        // TH3 : Gửi cả text message và ảnh
        else if (image.length > 0 && content && contentType === 'text') {
            console.log('Đã vào trường hợp 3 ở server!!!')
            // const textMessage = new Message({
            //     conversation_id,
            //     senderId,
            //     content,
            //     contentType,
            //     replyTo, // new line
            // })
            let textMessage
            if (mongoose.Types.ObjectId.isValid(replyTo)) {
                console.log('Có reply')
                textMessage = new Message({
                    conversation_id,
                    senderId,
                    content,
                    contentType,
                    replyTo, // new line
                })
            } else {
                console.log('No reply')
                textMessage = new Message({
                    conversation_id,
                    senderId,
                    content,
                    contentType,
                })
            }

            textMessage.save()
            const uploadPromises = image.map((img) => {
                // Tạo message cho text trước

                console.log('Tạo tin nhắn text message TH3 thành công!!!')

                // Tiếp theo, tạo message cho ảnh
                const fileType = img.originalname.split('.')[1]
                const filePath = `${img.originalname.split('.')[0]}.${fileType}`
                const params = {
                    Bucket: bucketname,
                    Key: filePath,
                    Body: img.buffer,
                    ContentType: img.mimetype,
                }

                return new Promise((resolve, reject) => {
                    S3.upload(params, async (err, data) => {
                        if (err) {
                            console.log('Lỗi khi tải ảnh lên S3!!!', err)
                            reject(err)
                        } else {
                            const ImageURL = data.Location
                            console.log(
                                'Các giá trị bên server ở TH3: ',
                                conversation_id,
                                senderId,
                                ImageURL,
                                contentType,
                                replyTo // new line
                            )
                            // const imageMessage = new Message({
                            //     conversation_id,
                            //     senderId,
                            //     content: ImageURL,
                            //     contentType: 'image',
                            //     replyTo, // new line
                            // })
                            let imageMessage
                            if (mongoose.Types.ObjectId.isValid(replyTo)) {
                                console.log('Có reply')
                                imageMessage = new Message({
                                    conversation_id,
                                    senderId,
                                    content: ImageURL,
                                    contentType: 'image',
                                    replyTo, // new line
                                })
                            } else {
                                console.log('No reply')
                                imageMessage = new Message({
                                    conversation_id,
                                    senderId,
                                    content: ImageURL,
                                    contentType: 'image',
                                })
                            }

                            try {
                                await imageMessage.save()
                                console.log(
                                    'Tạo tin nhắn TH3 thành công trên db !!!'
                                )
                                resolve({ textMessage, imageMessage }) // Thay đổi ở đây
                            } catch (err) {
                                console.error(err) // log lỗi
                                reject(err)
                            }
                        }
                    })
                })
            })

            Promise.all(uploadPromises)
                .then((messages) => {
                    console.log('Tạo tin nhắn TH3 ở Promise thành công!!!')
                    const textMessages = messages[0].textMessage // Chỉ lấy textMessage từ hình ảnh đầu tiên
                    const imageMessages = messages.map(
                        (message) => message.imageMessage
                    )
                    return res.status(200).json({
                        thongbao: 'Tạo tin nhắn thành công!!!',
                        textMessage: textMessages,
                        imageMessage: imageMessages,
                    })
                })
                .catch((err) => {
                    return res.status(500).json({
                        message: 'Lỗi khi tạo message!!!',
                        error: err.message, // thêm chi tiết lỗi
                    })
                })
        }
    }


    async forwardMessageWeb(req, res) {
        try {
            const { message_id, conversation_id, forwarded_by, forwarded_at, original_sender } = req.body;

            if (!mongoose.Types.ObjectId.isValid(message_id) || !mongoose.Types.ObjectId.isValid(conversation_id)) {
                return res.status(400).json({ thongbao: 'ID không hợp lệ!' });
            }

            const originalMessage = await Message.findById(message_id);
            if (!originalMessage) {
                return res.status(404).json({ thongbao: 'Không tìm thấy tin nhắn gốc!' });
            }

            const forwardedMessage = new Message({
                conversation_id,
                senderId: forwarded_by,
                content: originalMessage.content,
                contentType: originalMessage.contentType,
                isForwarded: true,
                originalMessage: message_id,
                forwardedBy: forwarded_by,
                forwardedAt: forwarded_at || new Date(),
                originalSender: original_sender, // ⚠️ cần dòng này
            });

            await forwardedMessage.save();

            await forwardedMessage.populate([
                { path: 'forwardedBy', select: 'userName firstName lastName' },
                { path: 'originalSender', select: 'userName firstName lastName' },
            ]);

            console.log('✅ Message populated:', forwardedMessage);

            // Emit socket event to notify clients in the conversation room (group)
            if (io) {
                io.to(conversation_id.toString()).emit('receive-message', forwardedMessage);
            }

            return res.status(200).json({
                thongbao: 'Chuyển tiếp tin nhắn thành công!',
                message: forwardedMessage,
            });
        } catch (error) {
            console.error('Lỗi chuyển tiếp tin nhắn:', error);
            return res.status(500).json({
                thongbao: 'Lỗi server khi chuyển tiếp tin nhắn!',
                error: error.message,
            });
        }
    }



    async getLastMessageWeb(req, res) {
        // console.log('heeqweqwe')
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        try {
            const conversation = await Conversation.findOne({
                _id: conversation_id,
            })
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            const lastMessage = await Message.findOne({
                conversation_id: conversation_id,
            }).sort({ createdAt: -1 })
            if (!lastMessage) {
                return res
                    .status(404)
                    .json({ message: 'No messages found in this conversation' })
            }
            // if (lastMessage.senderId.toString() === user_id) {
            if (
                lastMessage.senderId &&
                lastMessage.senderId.toString() === user_id
            ) {
                let content
                if (lastMessage.recalled) {
                    content = 'Tin nhắn đã bị thu hồi'
                } else {
                    switch (lastMessage.contentType) {
                        case 'image':
                            content = 'hình ảnh'
                            break
                        case 'video':
                            const urlParts123 = lastMessage.content.split('/')
                            content = urlParts123[urlParts123.length - 1]
                            break
                        case 'audio':
                            content = 'audio'
                            break
                        case 'file':
                            // Extract file name from URL
                            const urlParts = lastMessage.content.split('/')
                            content = urlParts[urlParts.length - 1]
                            break
                        case 'notify':
                            content = lastMessage.content
                            break
                        default:
                            content = lastMessage.content
                    }
                }
                return res.status(200).json({
                    thongbao: 'Tìm thấy tin nhắn!!!',
                    message: 'Bạn : ' + content,
                })
            } else {
                const user = await User.findOne({
                    _id: lastMessage.senderId,
                })
                let content
                if (lastMessage.recalled) {
                    content = 'Tin nhắn đã bị thu hồi'
                } else {
                    switch (lastMessage.contentType) {
                        case 'image':
                            content = 'hình ảnh'
                            break
                        case 'video':
                            const urlParts123 = lastMessage.content.split('/')
                            content = urlParts123[urlParts123.length - 1]
                            break
                        case 'audio':
                            content = 'audio'
                            break
                        case 'file':
                            // Extract file name from URL
                            const urlParts = lastMessage.content.split('/')
                            content = urlParts[urlParts.length - 1]
                            break
                        case 'notify':
                            content = lastMessage.content
                            break
                        default:
                            content = lastMessage.content
                    }
                }
                return res.status(200).json({
                    thongbao: 'Tìm thấy tin nhắn!!!',
                    message: user.userName + ' : ' + content,
                })
            }
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // api lấy content tin nhắn dựa vào replyTo có nội dung là message_id
    async getMessageReplyContentWeb(req, res) {
        const replyTo = req.body.replyTo
        const message = await Message.findOne({
            _id: replyTo,
        })
        if (!message) {
            return res.status(404).json({
                thongbao: 'Không tìm thấy tin nhắn!!!',
            })
        }
        return res.status(200).json({
            thongbao: 'Tìm thấy tin nhắn!!!',
            message: message.content,
        })
    }

    // post findAllMessagesWeb http://localhost:3001/message/findAllMessagesWeb
    async findAllMessagesWeb(req, res) {
        const conversation_id = req.body.conversation_id
        // tìm tất cả tin nhắn trong conversation_id
        const messages = await Message.find({
            conversation_id: conversation_id,
        })

        if (messages.length > 0) {
            console.log('Tìm thấy tin nhắn!!!')
            return res.status(200).json({
                thongbao: 'Tìm thấy tin nhắn!!!',
                messages: messages,
            })
        } else {
            console.log('Không tìm thấy tin nhắn!!!')
            return res.status(200).json({
                thongbao: 'Không tìm thấy tin nhắn!!!',
            })
        }
    }
    // post thu hồi tin nhắn cả 2 bên recallMessageWeb http://localhost:3001/message/recallMessageWeb
    async recallMessageWeb(req, res) {
        const message_id = req.body.message_id

        const message = await Message.findOne({
            _id: message_id,
        })
        // Kiểm tra xem message có tồn tại không
        if (!message) {
            return res.status(404).json({
                thongbao: 'Không tìm thấy tin nhắn!!!',
            })
        }
        // Đánh dấu tin nhắn đã được thu hồi
        message.recalled = true
        await message.save()

        // Emit socket event to notify clients in the conversation room
        if (io) {
            io.to(message.conversation_id.toString()).emit('message-recalled', message)
        }

        return res.status(200).json({
            thongbao: 'Thu hồi tin nhắn thành công!!!',
            message: message,
        })
    }
    // post tìm tất cả tin nhắn đã bị thu hồi findAllRecallMessagesWeb http://localhost:3001/message/findAllRecallMessagesWeb
    async findAllRecallMessagesWeb(req, res) {
        const conversation_id = req.body.conversation_id
        // tìm tất cả tin nhắn trong conversation_id
        const messages = await Message.find({
            conversation_id: conversation_id,
            recalled: true,
        })
        if (messages.length > 0) {
            console.log('Tìm thấy tin nhắn đã thu hồi!!!')
            return res.status(200).json({
                thongbao: 'Tìm thấy tin nhắn đã thu hồi!!!',
                messages: messages,
            })
        } else {
            console.log('Không tìm thấy tin nhắn đã thu hồi!!!')
            return res.status(200).json({
                thongbao: 'Không tìm thấy tin nhắn đã thu hồi!!!',
            })
        }
    }

    // post deleteMyMessageWeb xoá tin nhắc ở phía tôi http://localhost:3001/message/deleteMyMessageWeb
    async deleteMyMessageWeb(req, res) {
        const { message_id, user_id } = req.body

        try {
            const message = await Message.findById(message_id)
            if (!message) {
                return res.status(200).json({ error: 'Tin nhắn không tồn tại' })
            }

            // kiểm tra xem user đã xoá tin nhắn này chưa nếu chưa thì thêm vào mảng deletedBy
            if (!message.deletedBy.includes(user_id)) {
                message.deletedBy.push(user_id)
                await message.save()
                // emit a 'message-deleted' event to the user who deleted the message
                if (io) {
                    io.to(message.conversation_id.toString()).emit('message-deleted', message_id)
                }
            }

            return res.status(200).json({
                thongbao: 'Xoá chỉ ở phía tôi thành công!!!',
                message: message,
            })
        } catch (error) {
            res.status(500).json({ error: 'Lỗi' })
        }
    }
    // post findAllDeleteMyMessageWeb lấy tất cả tin nhắn đã bị xoá ở phía tôi http://localhost:3001/message/findAllDeleteMyMessageWeb
    async findAllDeleteMyMessageWeb(req, res) {
        const conversation_id = req.body.conversation_id
        // tìm tất cả tin nhắn trong conversation_id
        const messages = await Message.find({
            conversation_id: conversation_id,
            deletedBy: { $ne: [] },
        })

        if (messages.length > 0) {
            console.log('Tìm thấy tin nhắn đã bị xoá ở phía tôi!!!')
            return res.status(200).json({
                thongbao: 'Tìm thấy tin nhắn đã bị xoá ở phía tôi!!!',
                messages: messages,
            })
        } else {
            console.log('Không tìm thấy tin nhắn đã bị xoá ở phía tôi!!!')
            return res.status(200).json({
                thongbao: 'Không tìm thấy tin nhắn đã bị xoá ở phía tôi!!!',
            })
        }
    }



    async uploadMediaWeb(req, res) {
        console.log('Đã vào hàm uploadMediaWeb ở server!!!')
        const conversation_id = req.body.conversation_id
        const senderId = req.body.user_id
        const content = req.body.content
        const contentType = req.body.contentType
        const media = req.files
        console.log(
            'Các giá trị bên server là: ',
            conversation_id,
            senderId,
            content,
            contentType,
            media
        )
        const uploadPromises = media.map((media) => {
            const mediaParts = media.originalname.split('.')
            const fileType = mediaParts[mediaParts.length - 1]
            const filePath = `${mediaParts[0]}.${fileType}`
            const params = {
                Bucket: bucketname,
                Key: filePath,
                Body: media.buffer,
                ContentType: media.mimetype,
            }
            return new Promise((resolve, reject) => {
                S3.upload(params, async (err, data) => {
                    if (err) {
                        console.log('Lỗi khi tải ảnh lên S3!!!', err)
                        reject(err)
                    } else {
                        const mediaURL = data.Location
                        const MediaMessage = new Message({
                            conversation_id,
                            senderId,
                            content: mediaURL,
                            contentType,
                        })
                        await MediaMessage.save()
                        console.log(MediaMessage)
                        resolve(MediaMessage)
                    }
                })
            })
        })
        Promise.all(uploadPromises)
            .then((MediaMessage) => {
                console.log('Tải media lên thành công!!!')
                return res.status(200).json({
                    thongbao: 'Tải media lên thành công!!!',
                    MediaMessage: MediaMessage,
                })
            })
            .catch((err) => {
                return res.status(200).json({
                    message: 'Lỗi khi tải media lên!!!',
                    error: err.message, // thêm chi tiết lỗi
                })
            })
    }

    async createNotificationWeb(req, res) {
        const {
            conversation_id,
            sender_id,
            action,
            receiver_id,
            conversationNameNew,
        } = req.body
        let receiverName
        const senderName = await getUserName(sender_id)
        // néu action là add,remove,exit thì tạp targetName
        if (
            action === 'add' ||
            action === 'remove' ||
            action === 'exit' ||
            action === 'addDeputyLeader' ||
            action === 'changeGroupLeader' ||
            action === 'deleteDeputyLeader'
        ) {
            receiverName = await getUserName(receiver_id)
        }

        // Tạo nội dung thông báo dựa trên hành động
        let content
        switch (action) {
            case 'add':
                content = `${receiverName} đã được ${senderName} thêm vào nhóm.`
                break
            case 'remove':
                content = `${receiverName} đã được ${senderName}  xóa khỏi nhóm.`
                break
            case 'exit':
                content = ` ${senderName} đã rời khỏi nhóm.`
                break
            case 'rename':
                content = `Tên nhóm đã được ${senderName} thay đổi thành ${conversationNameNew}.`
                break
            // Thêm các trường hợp khác nếu cần
            // thêm trường hợp thêm phó nhóm
            case 'addDeputyLeader':
                content = `${receiverName} đã được ${senderName} bổ nhiệm làm Phó nhóm.`
                break
            // thêm trường hợp chuyển quyền trưởng nhóm
            case 'changeGroupLeader':
                content = `${receiverName} đã được ${senderName} chuyển quyền trưởng nhóm.`
                break
            // xoá phó nhóm
            case 'deleteDeputyLeader':
                content = `${receiverName} đã bị ${senderName} gỡ quyền phó nhóm.`
                break
            default:
                content = ''
        }

        // Tạo thông báo
        const notification = new Message({
            conversation_id,
            sender_id,
            contentType: 'notify',
            content,
        })

        // Lưu thông báo vào cơ sở dữ liệu
        try {
            await notification.save()
            res.status(200).send({
                message: 'Tạo thông báo thành công',
                notification: notification.content,
                noti: notification,
            })
        } catch (err) {
            res.status(500).send({ message: 'Lỗi khi tạo thông báo.' })
        }
    }
    //viết 1 api lấy toàn bộ image và video dựa vào conversation_id trong message
    async getAllMediaWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const media = await Message.find({
            conversation_id: conversation_id,
            contentType: { $in: ['image'] },
        })
        if (media.length === 0) {
            return res.status(200).json({
                thongbao: 'Không tìm thấy media!!!',
            })
        }
        if (media.length > 0) {
            const mediaLinks = media.map((m) => m.content) // Extract the content links
            return res.status(200).json({
                thongbao: 'Tìm thấy media!!!',
                media: mediaLinks, // Return the links instead of the full media objects
            })
        }
    }
    // viết 1 api lấy toàn bộ file dựa vào conversation_id trong message
    async getAllFileWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const files = await Message.find({
            conversation_id: conversation_id,
            contentType: { $in: ['file', 'video'] },
        })
        if (files.length === 0) {
            return res.status(200).json({
                thongbao: 'Không tìm thấy file!!!',
            })
        }
        if (files.length > 0) {
            const fileLinks = files.map((f) => f.content) // Extract the content links
            // return res.status(200).json({
            //     thongbao: 'Tìm thấy file!!!',
            //     files: fileLinks, // Return the links instead of the full media objects
            // })
            // trả về 1 danh sách files bao gồm tên file ở cuối link và link
            return res.status(200).json({
                thongbao: 'Tìm thấy file!!!',
                files: files.map((f) => {
                    const fileParts = f.content.split('/')
                    const fileName = fileParts[fileParts.length - 1]
                    return { fileName, fileLink: f.content }
                }),
            })
        }
    }

    /// mobile --------------
    async addMessage(req, res) {
        const { conversation_id, senderId, content, contentType } = req.body;
        const newMessage = new Message({
            conversation_id,
            senderId,
            content,
            contentType,
        });
        try {
            var message = await Message.create(newMessage);
            message = await Message.populate(message, [
                { path: 'senderId', select: 'userName avatar phoneNumber' },
                { path: 'conversation_id' },
            ]);
            message = await User.populate(message, {
                path: 'conversation_id.members',
                select: 'userName avatar phoneNumber',
            });
            await Conversation.findByIdAndUpdate(conversation_id, { lastMessage: message._id });
            res.status(200).json(message);
        } catch (err) {
            throw new Error(err.message);
        }
    }

    async getMessagesByConversationID(req, res) {
        try {
            const messages = await Message.find({ conversation_id: req.params.conversation_id })
                .populate('senderId', 'userName avatar phoneNumber lastName')
                .populate('conversation_id');
            res.status(200).json(messages);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async recallMessage(req, res) {
        try {
            const message = await Message.findById(req.params.id);
            message.recalled = true;
            const result = await message.save();
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async deleteMyMessage(req, res) {
        const { message_id, user_id } = req.body;
        try {
            const message = await Message.findById(message_id);
            if (!message) {
                return res.status(200).json({ error: 'Tin nhắn không tồn tại' });
            }
            if (!message.deletedBy.includes(user_id)) {
                message.deletedBy.push(user_id);
                await message.save();
            }
            io.to(message.conversation_id).emit('message-deleted', message_id);
            console.log(`Emit message-deleted: ${message_id} to room ${message.conversation_id}`);
            return res.status(200).json({
                thongbao: 'Xoá chỉ ở phía tôi thành công!!!',
                message: message,
            });
        } catch (error) {
            res.status(500).json({ error: 'Lỗi' });
        }
    }

    async findNewestMessage(req, res) {
        try {
            let index = 0;
            let message = await Message.findOne(
                { conversation_id: req.params.conversation_id },
                null,
                { sort: { createdAt: -1 }, limit: 1, skip: index }
            );
            while (message && message.deletedBy.includes(req.body.userId)) {
                index++;
                message = await Message.findOne(
                    { conversation_id: req.params.conversation_id },
                    null,
                    { sort: { createdAt: -1 }, limit: 1, skip: index }
                );
            }
            console.log('message', message);
            res.status(200).json(message);
        } catch (err) {
            res.status(500).json(err);
        }
    }

    async getLastMessageMobile(req, res) {
        const conversation_id = req.body.conversation_id;
        const user_id = req.body.user_id;

        try {
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            const message = await Message.findOne({ conversation_id })
                .sort({ createdAt: -1 })
                .populate('senderId', 'userName avatar');

            if (!message) {
                return res.status(200).json({
                    message: 'Chưa có tin nhắn',
                    message: null,
                });
            }

            return res.status(200).json({
                message: 'Tìm thấy tin nhắn cuối cùng!!!',
                message: message,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    async createMessagesMobile(req, res) {
        const conversation_id = req.body.conversation_id;
        const senderId = req.body.user_id;
        const contentType = req.body.contentType;
        const file = req.file;
        const replyTo = req.body.replyTo;
        const content = req.body.content;

        console.log('Mobile input:', { conversation_id, senderId, contentType, file, replyTo, content });

        if (!senderId || !contentType) {
            return res.status(400).json({ message: 'Thiếu tham số bắt buộc' });
        }

        try {
            // Nếu không có conversation_id (upload ảnh đại diện nhóm), chỉ upload file và trả về URL
            if (!conversation_id || conversation_id === 'temp') {
                if (!file) {
                    return res.status(400).json({ message: 'Thiếu file khi upload ảnh' });
                }

                const fileType = file.originalname.split('.').pop();
                const cleanFileName = file.originalname.split(/[-_]/).pop();
                const filePath = `zola_${contentType}_${cleanFileName}`;
                const params = {
                    Bucket: bucketname,
                    Key: filePath,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };

                console.log('Chuẩn bị upload S3:', params);
                const uploadResult = await S3.upload(params).promise();
                console.log('Kết quả upload S3:', uploadResult);

                return res.status(200).json({
                    thongbao: 'Upload ảnh thành công',
                    messages: { content: uploadResult.Location },
                });
            }

            // Kiểm tra conversation và thành viên (cho các trường hợp chat)
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }
            if (!conversation.members.includes(senderId)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên của nhóm' });
            }

            // TH1: Gửi tin nhắn văn bản
            if (contentType === 'text' && content) {
                let message = replyTo && mongoose.Types.ObjectId.isValid(replyTo)
                    ? new Message({ conversation_id, senderId, content, contentType, replyTo })
                    : new Message({ conversation_id, senderId, content, contentType });

                await message.save();
                io.to(conversation_id).emit('receive-message', message);
                return res.status(200).json({
                    thongbao: 'Tạo tin nhắn văn bản thành công',
                    messages: message,
                });
            }

            // TH2: Gửi file (image, video, file, audio)
            if (['image', 'video', 'file', 'audio'].includes(contentType) && file) {
                const fileType = file.originalname.split('.').pop();
                const cleanFileName = file.originalname.split(/[-_]/).pop();
                const filePath = `zola_${contentType}_${cleanFileName}`;
                const params = {
                    Bucket: bucketname,
                    Key: filePath,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                };

                console.log('Chuẩn bị upload S3:', params);
                const uploadResult = await S3.upload(params).promise();
                console.log('Kết quả upload S3:', uploadResult);

                const fileURL = uploadResult.Location;

                let message = replyTo && mongoose.Types.ObjectId.isValid(replyTo)
                    ? new Message({ conversation_id, senderId, content: fileURL, contentType, replyTo })
                    : new Message({ conversation_id, senderId, content: fileURL, contentType });

                await message.save();
                io.to(conversation_id).emit('receive-message', message);
                return res.status(200).json({
                    thongbao: 'Tạo tin nhắn media thành công',
                    messages: message,
                });
            }

            return res.status(400).json({ message: 'Loại nội dung không hỗ trợ hoặc thiếu file' });
        } catch (err) {
            console.error('Lỗi tạo tin nhắn mobile:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // Hàm Mobile mới: Tạo thông báo cho sự kiện nhóm
    async createNotificationMobile(req, res) {
        const { conversation_id, sender_id, action, receiver_id, conversationNameNew } = req.body;
        let receiverName;
        const senderName = await getUserName(sender_id);
        if (['add', 'remove', 'exit', 'addDeputyLeader', 'changeGroupLeader', 'deleteDeputyLeader'].includes(action)) {
            receiverName = await getUserName(receiver_id);
        }

        let content;
        switch (action) {
            case 'add':
                content = `${receiverName} đã được ${senderName} thêm vào nhóm.`;
                break;
            case 'remove':
                content = `${receiverName} đã được ${senderName} xóa khỏi nhóm.`;
                break;
            case 'exit':
                content = `${senderName} đã rời khỏi nhóm.`;
                break;
            case 'rename':
                content = `Tên nhóm đã được ${senderName} thay đổi thành ${conversationNameNew}.`;
                break;
            case 'addDeputyLeader':
                content = `${receiverName} đã được ${senderName} bổ nhiệm làm Phó nhóm.`;
                break;
            case 'changeGroupLeader':
                content = `${receiverName} đã được ${senderName} chuyển quyền trưởng nhóm.`;
                break;
            case 'deleteDeputyLeader':
                content = `${receiverName} đã bị ${senderName} gỡ quyền phó nhóm.`;
                break;
            default:
                content = '';
        }

        const notification = new Message({
            conversation_id,
            senderId: sender_id,
            contentType: 'notify',
            content,
        });

        try {
            await notification.save();
            emitGroupEvent(conversation_id, action, { userName: receiverName || senderName, conversationName: conversationNameNew });

            res.status(200).send({
                message: 'Tạo thông báo thành công',
                notification: notification.content,
                noti: notification,
            });
        } catch (err) {
            console.error('Lỗi tạo thông báo mobile:', err);
            res.status(500).send({ message: 'Lỗi khi tạo thông báo.', error: err.message });
        }
    }

    // Hàm Mobile mới: Chuyển tiếp tin nhắn
    async forwardMessageMobile(req, res) {
        const { message_id, conversation_id, user_id } = req.body;

        try {
            const message = await Message.findById(message_id);
            if (!message) {
                return res.status(404).json({ thongbao: 'Không tìm thấy tin nhắn!!!' });
            }

            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }
            if (!conversation.members.includes(user_id)) {
                return res.status(403).json({ message: 'Bạn không phải thành viên của nhóm' });
            }

            const newMessage = new Message({
                conversation_id,
                senderId: user_id,
                content: message.content,
                contentType: message.contentType,
            });

            await newMessage.save();
            io.to(conversation_id).emit('receive-message', newMessage);
            return res.status(200).json({
                thongbao: 'Chuyển tiếp tin nhắn thành công!!!',
                message: newMessage,
            });
        } catch (err) {
            console.error('Lỗi chuyển tiếp tin nhắn mobile:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // Hàm Mobile mới: Lấy tất cả media (image)
    async getAllMediaMobile(req, res) {
        const conversation_id = req.body.conversation_id;
        try {
            const media = await Message.find({ conversation_id, contentType: { $in: ['image'] } });
            if (media.length === 0) {
                return res.status(200).json({ thongbao: 'Không tìm thấy media!!!' });
            }
            const mediaLinks = media.map((m) => m.content);
            return res.status(200).json({
                thongbao: 'Tìm thấy media!!!',
                media: mediaLinks,
            });
        } catch (err) {
            console.error('Lỗi lấy media mobile:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // Hàm Mobile mới: Lấy tất cả file (file, video)
    async getAllFileMobile(req, res) {
        const conversation_id = req.body.conversation_id;
        try {
            const files = await Message.find({ conversation_id, contentType: { $in: ['file', 'video'] } });
            if (files.length === 0) {
                return res.status(200).json({ thongbao: 'Không tìm thấy file!!!' });
            }
            return res.status(200).json({
                thongbao: 'Tìm thấy file!!!',
                files: files.map((f) => {
                    const fileParts = f.content.split('/');
                    const fileName = fileParts[fileParts.length - 1];
                    return { fileName, fileLink: f.content };
                }),
            });
        } catch (err) {
            console.error('Lỗi lấy file mobile:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
}

async function getUserName(userId) {
    const user = await User.findOne({ _id: userId });
    if (!user) {
        console.log('Không tìm thấy user!!!');
        return null;
    } else {
        return user.userName;
    }
}
export default new MessageController()
