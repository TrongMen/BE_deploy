import User from '../models/User.js'
import Account from '../models/Account.js';
import ConversationController from './ConversationController.js';
import { io } from '../../index.js';

import AWS from 'aws-sdk'
import path from 'path'
import multer from 'multer'
import dotenv from 'dotenv'
dotenv.config()
import uploadDefaultAvatar from '../../util/uploadDefaultAvatar.js'
// require('dotenv').config()
import { v4 as uuidv4 } from 'uuid'
AWS.config.update({
    accessKeyId: process.env.Acces_Key,
    secretAccessKey: process.env.Secret_Acces_Key,
    region: process.env.Region,
})

const S3 = new AWS.S3()
const bucketname = process.env.s3_bucket

const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '')
    },
})
const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // giới hạn file 2MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb)
    },
})
function checkFileType(file, callback) {
    const filetypes = /jpeg|jpg|png|gif/
    const extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
    )
    const mimetype = filetypes.test(file.mimetype)
    if (mimetype && extname) {
        return callback(null, true)
    } else {
        callback('Error: Images Only!')
    }
}

class UserController {
    // post /registerWeb http://localhost:3001/user/registerWeb
    async registerWeb(req, res) {
        const account_id = req.body.account_id

        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const userName = `${firstName} ${lastName}`
        const phoneNumber = req.body.phoneNumber
        const dateOfBirth = req.body.dateOfBirth
        const gender = req.body.gender
        // console.log('hello user')

        // const avatar =
        //     'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQu2whjzwoBz71waeE07wh1L_sfjpdm6IIf7g'
        const avatar = uploadDefaultAvatar(lastName)
        // console.log('avatar: ', avatar)
        // return res
        //     .status(200)
        //     .json({ message: 'Đăng ký User thành công!!!', avatar: avatar })

        const user = new User({
            account_id,
            userName,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            gender,
            avatar,
        })

        console.log(user)

        await user
            .save()
            .then(() => {
                res.status(200).json({
                    message: 'Đăng ký User thành công!!!',
                    phoneNumber: phoneNumber,
                    user_id: user._id,
                })
            })
            .catch((err) => {
                console.log(err)
                res.status(500).json(err)
            })
    }

    // post /findUser http://localhost:3001/user/findUser
    async findUserByAccountIDWeb(req, res) {
        const account_id = req.body.account_id

        // từ account đã đăng nhập thành công thì tìm ra user tương ứng với account đó
        const user = await User.findOne({ account_id: account_id })
        //console.log('user: ' + user)
        const user_id = user._id

        if (user) {
            console.log('Lấy user từ account thành công 123123')
            res.status(200).json({
                message: 'Login successfully!!!',
                user_id: user_id,
            })
        } else {
            console.log('Không tìm thấy user từ account')
            res.status(200).json({ message: 'User not found!!!' })
        }
    }
    // post findUserByUserID
    async findUserByUserID(req, res) {
        const user_id = req.body.user_id
        console.log('user_id  được truyền qua server là: ', user_id)

        const user = await User.findOne({ _id: user_id })
        // console.log('user là: ', user)
        if (user) {
            return res.status(200).json({
                message: 'Tìm user thành công!!!',
                user: user,
            })
        } else {
            return res.status(200).json({
                message: 'Không tìm thấy user!!!',
            })
        }
    }

    // website
    // findalluser web
    async findAllUsersWeb(req, res) {
        const allUsers = await User.find()
        console.log('allUsers: ', allUsers)
        return res
            .status(200)
            .json({ message: 'Tìm tất cả user thành công!!!', users: allUsers })
        // return res
        //     .status(200)
        //     .json({ message: 'Tìm tất cả user thành công!!!' })
    }
    //findUserByPhone
    async findUserByPhoneWeb(req, res) {
        const phoneNumber = req.body.phoneNumber
        const user = await User.findOne({ phoneNumber: phoneNumber })

        console.log('user: ', user)
        if (user) {
            return res.status(200).json({
                message: 'Tìm user thành công!!!',
                user: user,
            })
        } else {
            return res.status(200).json({
                message: 'Không tìm thấy user!!!',
            })
        }
    }
    // post /addFriend Web
    // async addFriendWeb(req, res) {
    //     const user_id = req.body.user_id
    //     // friend_id chính là user_id của user mà mình muốn thêm vào friend list
    //     const friend_id = req.body.friend_id
    //     const friendName = req.body.friendName
    //     const avatar = req.body.avatar

    //     const user = await User.findOne({ _id: user_id })
    //     if (user) {
    //         user.friend.push({
    //             friend_id,
    //             friendName,
    //             avatar,
    //         })
    //         await user.save()
    //         console.log('user người A kết bạn là : ', user)

    //         // sau khi người dùng thêm bạn bè thì người đó cũng sẽ là bạn bè của người mà người đó thêm vào
    //         const friend = await User.findOne({ _id: friend_id })
    //         if (friend) {
    //             friend.friend.push({
    //                 friend_id: user_id,
    //                 friendName: user.userName,
    //                 avatar: user.avatar,
    //             })
    //             await friend.save()
    //             console.log('friend: ', friend)
    //             return res.status(200).json({
    //                 message: 'Thêm bạn bè thành công!!!',
    //                 user: user,
    //                 friend: friend,
    //             })
    //         }
    //         console.log('user người B được kết bạn là : ', friend)
    //         return res.status(200).json({
    //             message: 'Thêm bạn bè thành công!!!',
    //             user: user,
    //             friend: friend,
    //         })
    //     } else {
    //         // in ra lỗi
    //         res.json('Không thể thêm bạn bè !!!')
    //     }
    // }

    async addFriendWeb(req, res) {
        const user_id = req.body.user_id
        // friend_id chính là user_id của user mà mình muốn thêm vào friend list
        const friend_id = req.body.friend_id
        const user = await User.findOne({ _id: user_id })
        if (user) {
            user.friend.push({
                friend_id,
            })
            await user.save()
            console.log('user người A kết bạn là : ', user)

            // sau khi người dùng thêm bạn bè thì người đó cũng sẽ là bạn bè của người mà người đó thêm vào
            const friend = await User.findOne({ _id: friend_id })
            if (friend) {
                friend.friend.push({
                    friend_id: user_id,
                })
                await friend.save()
                console.log('friend: ', friend)
                return res.status(200).json({
                    message: 'Thêm bạn bè thành công!!!',
                    user: user,
                    friend: friend,
                })
            }
            console.log('user người B được kết bạn là : ', friend)
            return res.status(200).json({
                message: 'Thêm bạn bè thành công!!!',
                user: user,
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể thêm bạn bè !!!')
        }
    }
    async deleteFriendWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const user = await User.findOne({ _id: user_id })
        // khi user xóa bạn bè thì bạn bè cũng sẽ xóa user đó khỏi friend list của mình tuy nhiên khi xoá thì friend được xoá sẽ vô trường phụ là deleteFriend chứ không xoá hẳn
        const friend = await User.findOne({ _id: friend_id })
        console.log('user trước khi xóa là: ', user)
        console.log('friend trước khi xóa là: ', friend)
        if (user && friend) {
            // Find the friend to delete in user's friend list
            const deletedFriendInUser = user.friend.find(
                (friend) => friend.friend_id === friend_id
            )
            // Find the user in friend's friend list
            const deletedUserInFriend = friend.friend.find(
                (friend) => friend.friend_id === user_id
            )

            // Remove friend from user's friend list
            user.friend = user.friend.filter(
                (friend) => friend.friend_id !== friend_id
            )
            // Add the deleted friend to user's deleteFriend list
            user.deleteFriend.push(deletedFriendInUser)

            // Remove user from friend's friend list
            friend.friend = friend.friend.filter(
                (friend) => friend.friend_id !== user_id
            )
            // Add the deleted user to friend's deleteFriend list
            friend.deleteFriend.push(deletedUserInFriend)

            await user.save()
            await friend.save()
            console.log('user sau khi xóa là: ', user)
            console.log('friend sau khi xóa là: ', friend)
            return res.status(200).json({
                message: 'Xóa bạn bè thành công!!!',
                user: user,
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể xóa bạn bè !!!')
        }
    }

    // showw cho mobile và web
    async showFriendRequests(req, res) {
        //  res.status(200).json('show friend requests')
        try {
            const { userId } = req.params
            //const user = await User.findById({_id:userId})
            const user = await User.findById({ _id: userId })
                .populate('friendRequests', 'userName phoneNumber avatar')
                .lean()
            // const friendRequests = user.friendRequests;
            res.status(200).json(user.friendRequests)
            //res.status(200).json(user);
        } catch (error) {
            console.log(error)
            //res.sendStatus(500).json('Interval server error');
        }
    }
    async showSentFriendRequests(req, res) {
        try {
            const { userId } = req.params
            //const user = await User.findById({_id:userId})
            const user = await User.findById({ _id: userId })
                .populate('sentFriendRequests', 'userName phoneNumber avatar')
                .lean()
            res.status(200).json(user.sentFriendRequests)
        } catch (error) {
            console.log(error)
            res.sendStatus(500).json('Interval server error')
        }
    }

    async getInfoFriendWeb(req, res) {
        const friend_id = req.body.friend_id
        console.log('friend_id là: ', friend_id)
        // từ friend_id tìm ra user lấy ảnh và tên , và số điện thoại của friend
        const friend = await User.findOne({ _id: friend_id })
        // console.log('friend: ', friend)
        const friendName = friend.userName
        const avatar = friend.avatar
        const phoneNumber = friend.phoneNumber

        // gộp thông tin của friend thành 1 object
        const friendInfo = { friend_id, friendName, avatar, phoneNumber }

        if (friend) {
            return res.status(200).json({
                message: 'Lấy thông tin friend thành công!!!',
                friendInfo: friendInfo,
            })
        } else {
            return res.status(200).json({
                message: 'Không tìm thấy friend!!!',
            })
        }
    }

    // // findUserByAccountIDWeb
    // async findUserByAccountIDWeb(req, res) {
    //     const account_id = req.body.account_id
    //     const user = await User.findOne({ account_id: account_id })
    //     console.log('user: ', user)
    //     if (user) {
    //         return res.status(200).json({
    //             message: 'Tìm user thành công!!!',
    //             user: user,
    //         })
    //     } else {
    //         return res.status(200).json({
    //             message: 'Không tìm thấy user!!!',
    //         })
    //     }
    // }

    async ChangeImageAvatarWeb(req, res) {
        const user_id = req.body.user_id
        const image = req.file.originalname.split('.');
        // viết 1 hàm file Type
        const fileType = image[image.length - 1]
        const filePath = `${uuidv4() + Date.now().toString()}.${fileType}`;
        console.log(image, fileType, filePath)
        // return res.status(200).json({ message: 'xin chào' })

        // tìm user thông qua user_id
        const user = await User.findOne({ _id: user_id })
        const params = {
            Bucket: bucketname,
            Key: filePath,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }
        S3.upload(params, async (err, data) => {
            if (err) {
                console.log(
                    'Error occured while trying to upload to S3 bucket',
                    err
                )
            }
            const ImageURL = data.Location
            // update ảnh cho user
            user.avatar = ImageURL
            await user.save()

            if (data) {
                console.log('Upload to S3 bucket successfully', ImageURL)

                return res.status(200).json({
                    message: 'Upload ảnh thành công!!!',
                    avatarURL: ImageURL,
                })
            }
        })
    }

    // web thì chưa xài cái này
    async changeImageCoverAvatarWeb(req, res) {
        const user_id = req.body.user_id
        const image = req.file?.originalname.split('.')
        // viết 1 hàm file Type
        const fileType = image[image.length - 1]
        const filePath = `${image[0]}.${fileType}`
        console.log(image, fileType, filePath)
        // return res.status(200).json({ message: 'xin chào' })

        // tìm user thông qua user_id
        const user = await User.findOne({ _id: user_id })
        const params = {
            Bucket: bucketname,
            Key: filePath,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }
        S3.upload(params, async (err, data) => {
            if (err) {
                console.log(
                    'Error occured while trying to upload to S3 bucket',
                    err
                )
            }
            const ImageURL = data.Location
            // update ảnh cho user
            user.coverImage = ImageURL
            await user.save()

            if (data) {
                console.log('Upload to S3 bucket successfully', ImageURL)

                return res.status(200).json({
                    message: 'Upload ảnh thành công!!!',
                    avatarURL: ImageURL,
                })
            }
        })
    }
    // // viết  1 post updateUserWeb sửa đổi họ tên , giới tính , dateOfBirth

    async updateUserWeb(req, res) {
        const user_id = req.body.user_id
        const userName = req.body.userName
        const gender = req.body.gender
        const dateOfBirth = req.body.dateOfBirth

        // tự sinh ra firstName và lastName từ userName cái lastName là phần sau cùng của userName còn firstName là phần còn lại
        const firstName = userName.split(' ').slice(0, -1).join(' ')
        const lastName = userName.split(' ').slice(-1).join(' ')

        console.log(
            'Tất cả thông tin truyền qua server là: ',
            user_id,
            userName,
            gender,
            dateOfBirth
        )
        const user = await User.findOne({ _id: user_id })
        console.log('user trước khi thay đổi là: ', user)

        // kiểm tra first name

        if (user) {
            user.userName = userName

            user.firstName = firstName
            user.lastName = lastName
            user.gender = gender

            user.dateOfBirth = dateOfBirth
            await user.save()
            console.log('user sau khi thay đổi là: ', user)
            // return res.status(200).json({
            //     message: 'Cập nhật thông tin thành công!!!',
            //     user: user,
            // })

            // thêm 1 dấu / ở đây
            // }

            // bây giờ account_id của user này là 1 friend_id của 1 user khác tìm ra user đó và cập nhật thông tin của user đó trong friend list của user kia
            const userban = await User.findOne({
                'friend.friend_id': user_id,
            })
            console.log('User mà có friend bị thay đổi là : ', userban)
            if (userban) {
                let check = false // Biến check để kiểm tra xem có tìm thấy friend_id trùng khớp hay không
                // Duyệt qua tất cả các bạn bè
                for (let i = 0; i < userban.friend.length; i++) {
                    // Kiểm tra cái userban.friend[i].friend_id có trùng với account_id không
                    if (userban.friend[i].friend_id === user_id) {
                        userban.friend[i].friendName = user.userName
                        userban.friend[i].avatar = user.avatar
                        await userban.save()
                        console.log(
                            'user có friend sau khi thay đổi là: ',
                            userban
                        )
                        check = true
                        break
                    }
                }
                if (!check) {
                    console.log(
                        'không thấy friend_id nào trùng với account_id của user vừa thay đổi!!!'
                    )
                }
            }
            return res.status(200).json({
                message: 'Cập nhật thông tin thành công!!!',
                user: user,
                userban: userban,
            })
        }
    }
    // post /sendFriendRequest // gửi yêu cầu kết bạn
    async sendFriendRequestWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const friend = await User.findOne({ _id: friend_id })
        const user = await User.findOne({ _id: user_id })

        console.log('user: ', user)
        console.log('friend: ', friend)

        if (friend) {
            if (!friend.friendRequests) {
                friend.friendRequests = []
            }

            friend.friendRequests.push(user_id)

            // thêm vào friendRequests của user

            if (!user.sentFriendRequests) {
                user.sentFriendRequests = []
            }

            user.sentFriendRequests.push(friend_id)
            console.log('user sau khi thêm là: ', user.friendRequests)
            console.log('friend sau khi thêm là: ', friend.friendRequests)
            console.log('Gửi yêu cầu kết bạn thành công!!!')
            await friend.save()
            await user.save()
            return res.status(200).json({
                message: 'Gửi yêu cầu kết bạn thành công!!!',
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể gửi yêu cầu kết bạn !!!')
        }
    }
    // thu hồi lời mời kết bạn
    async cancelFriendRequestWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const user = await User.findOne({ _id: user_id })
        const friend = await User.findOne({ _id: friend_id })
        console.log('Friend trước khi thu hồi là: ', friend)
        if (user && friend) {
            friend.friendRequests = friend.friendRequests.filter(
                (request) => request.toString() !== user_id
            )
            user.sentFriendRequests = user.sentFriendRequests.filter(
                (request) => request.toString() !== friend_id
            )
            // Save user after removing friend request
            console.log('Friend sau khi thu hồi là: ', friend)
            await friend.save()
            await user.save()

            return res.status(200).json({
                message: 'Huỷ lời mời kết bạn thành công!!!',
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể Huỷ lời mời kết bạn !!!')
        }
    }
    // từ chối lời mời kết bạn thành công
    async deleteFriendRequestWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const user = await User.findOne({ _id: user_id })
        const friend = await User.findOne({ _id: friend_id })

        if (user && friend) {
            // Remove friend request
            user.friendRequests = user.friendRequests.filter(
                (request) => request.toString() !== friend_id
            )
            // Remove sent friend request
            friend.sentFriendRequests = friend.sentFriendRequests.filter(
                (request) => request.toString() !== user_id
            )

            // Ở trong

            await user.save()
            await friend.save()
            return res.status(200).json({
                message: 'Từ chối lời mời kết bạn thành công!!!',
                user: user,
            })
        } else {
            // in ra lỗi
            res.json('Không thể xóa lời mời kết bạn !!!')
        }
    }
    // post /acceptFriendRequest // người b đồng ý kết bạn với người a
    async acceptFriendRequestWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const user = await User.findOne({ _id: user_id })
        const friend = await User.findOne({ _id: friend_id })
        if (user && friend) {
            // Remove friend request
            user.friendRequests = user.friendRequests.filter(
                (request) => request.friend_id !== friend_id
            )

            // Add to friends list
            user.friend.push({
                friend_id,
                friendName: friend.userName,
                avatar: friend.avatar,
                phoneNumber: friend.phoneNumber,
            })
            friend.friend.push({
                friend_id: user_id,
                friendName: user.userName,
                avatar: user.avatar,
                phoneNumber: user.phoneNumber,
            })

            await user.save()
            await friend.save()

            return res.status(200).json({
                message: 'Đã chấp nhận yêu cầu kết bạn!!!',
                user: user,
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể chấp nhận yêu cầu kết bạn !!!')
        }
    }
    // api lấy avatar của user từ user_id
    async getInfoByUserIDWeb(req, res) {
        const sender_id = req.body.sender_id
        const user = await User.findOne({ _id: sender_id })
        if (user) {
            return res.status(200).json({
                message: 'Lấy thông tin thành công!!!',
                avatar: user.avatar,
                name: user.userName,
            })
        } else {
            return res.status(200).json({
                message: 'Không tìm thấy user!!!',
            })
        }
    }

    // mobile ----------
    async register(req, res) {
        const account_id = req.body.account_id
        const conversation_id = req.body.conversation_id
        const userName = req.body.userName
        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const phoneNumber = req.body.phoneNumber
        const dateOfBirth = req.body.dateOfBirth
        const gender = req.body.gender
        const avatar = req.body.avatar
        const coverImage = req.body.coverImage

        const user = new User({
            account_id,
            conversation_id,
            userName,
            firstName,
            lastName,
            phoneNumber,
            dateOfBirth,
            gender,
            avatar,
            coverImage,
        })

        console.log(user)

        await user
            .save()
            .then(() => {
                res.json('Register successfully!!!')
            })
            .catch((err) => {
                console.log(err)
                res.status(200).json(err)
            })
    }
    // get /findAllUsers
    async findAllUsers(req, res) {
        const users = await User.find()
        res.json(users)
    }
    // get /findUser
    async findUserByAccountID(req, res) {
        const account_id = req.query.account_id

        const user = await User.findOne({ account_id: account_id })
        if (user) {
            res.json(user)
        } else {
            res.json('User not found!!!')
        }
    }
    // put /addFriend
    async addFriend(req, res) {
        const user_id = req.query.user_id

        const account_id = req.body.account_id
        const name = req.body.name
        const avatar = req.body.avatar

        const user = await User.findOne({ _id: user_id })

        if (user) {
            user.friend.push({ friend_id: account_id, name, avatar, lastName })
            await user.save()
            res.json('Add friend successfully!!!')
        } else {
            res.json('User doesn`t exits !!!')
        }
    }
    async getInfoFriend(req, res) {
        try {
            const { userId } = req.params
            const user = await User.findOne({ _id: userId })
            if (!user) {
                return res.status(404).json({ message: 'User not found' })
            }

            const friendIds = user.friend.map((friend) => friend.friend_id)
            const friends = await User.find(
                { _id: { $in: friendIds } },
                'userName phoneNumber avatar lastName'
            )

            res.status(200).json(friends)
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: 'Internal server error' })
        }
    }
    async GetAllUsers(req, res) {
        const loggedInAccountId = req.query.account_id
        User.find({ account_id: { $ne: loggedInAccountId } })
            .then((users) => {
                res.status(200).json(users)
            })
            .catch((err) => {
                console.log('error in getting users', err)
                res.status(500).json('  Error retrieving users')
            })
    }
    // put /updateInfo
    async updateInfo(req, res) {
        const account_id = req.query.account_id

        const gender = req.body.gender
        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const dateOfBirth = req.body.dateOfBirth

        const user = await User.findOne({ account_id: account_id })
        if (user) {
            user.gender = gender
            user.firstName = firstName
            user.lastName = lastName
            user.dateOfBirth = dateOfBirth
            user.userName = firstName + ' ' + lastName
            await user.save()
            res.json('Update info successfully!!!')
        } else {
            res.json('User doesn`t exits !!!')
        }
    }
    // put /updateAvatar
    async updateAvatar(req, res) {
        const account_id = req.query.account_id

        const avatar = req.body.avatar

        const user = await User.findOne({ account_id: account_id })
        if (user) {
            user.avatar = avatar
            await user.save()
            res.json('Update avatar successfully!!!')
        } else {
            res.json('User doesn`t exits !!!')
        }
    }
    // put /updateCoverImage
    async updateCoverImage(req, res) {
        const account_id = req.query.account_id

        const coverImage = req.body.coverImage

        const user = await User.findOne({ account_id: account_id })
        if (user) {
            user.coverImage = coverImage
            await user.save()
            res.json('Update cover image successfully!!!')
        } else {
            res.json('User doesn`t exits !!!')
        }
    }
    // đã sửa mobile 
    async findUserByUserIDMobile(req, res) {
        try {
            const userId = req.params.userId;
            const user = await User.findById(userId)
                .select('userName phoneNumber avatar')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            return res.status(200).json(user);
        } catch (err) {
            console.error('Lỗi tìm người dùng:', err);
            return res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }
    async findUserByPhoneNumber(req, res) {
        const phoneNumber = req.params.phoneNumber
        try {
            const user = await User.findOne({ phoneNumber: phoneNumber })
            if (user) {
                res.status(200).json(user)
            } else {
                res.status(404).json('User not found')
            }
        } catch (err) {
            console.log(err)
            res.status(500).json('Error retrieving user')
        }
    }
    //accept a friend request Mobile//// //////////////

    async acceptFriendRequest(req, res) {
        try {
            const user_id = req.body.user_id;
            const friend_id = req.body.friend_id;
            const user = await User.findById(user_id);
            const friend = await User.findById(friend_id);

            if (!user || !friend) {
                return res.status(404).json({ message: 'Người dùng không tồn tại' });
            }

            // Xóa yêu cầu kết bạn
            user.friendRequests = user.friendRequests.filter(
                (request) => request.toString() !== friend_id
            );
            friend.sentFriendRequests = friend.sentFriendRequests.filter(
                (request) => request.toString() !== user_id
            );

            // Thêm vào danh sách bạn bè
            if (!user.friend.some(f => f.friend_id === friend_id)) {
                user.friend.push({ friend_id });
            }
            if (!friend.friend.some(f => f.friend_id === user_id)) {
                friend.friend.push({ friend_id: user_id });
            }

            // Tạo cuộc trò chuyện
            const conversationResponse = await ConversationController.createConversationsMobile({
                body: { user_id, friend_id },
            });

            if (conversationResponse.status !== 200) {
                throw new Error(conversationResponse.data.message || 'Tạo cuộc trò chuyện thất bại');
            }

            const conversation_id = conversationResponse.data.conversation._id;

            // Thêm conversation_id vào danh sách conversation_id
            if (!user.conversation_id.some(conv => conv.conversation_id === conversation_id)) {
                user.conversation_id.push({ conversation_id });
            }
            if (!friend.conversation_id.some(conv => conv.conversation_id === conversation_id)) {
                friend.conversation_id.push({ conversation_id });
            }

            await user.save();
            await friend.save();

            // Emit sự kiện Socket.IO
            io.to(user_id).emit('friend-accepted', { conversationId: conversation_id });
            io.to(friend_id).emit('friend-accepted', { conversationId: conversation_id });

            return res.status(200).json({
                message: 'Đã chấp nhận yêu cầu kết bạn!!!',
                user,
                friend,
                conversation: conversationResponse.data.conversation,
            });
        } catch (err) {
            console.error('Lỗi chấp nhận yêu cầu kết bạn:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async rejectFriendRequest(req, res) {
        try {
            const user_id = req.body.user_id;
            const friend_id = req.body.friend_id;

            const user = await User.findOne({ _id: user_id });
            const friend = await User.findOne({ _id: friend_id });

            if (user && friend) {
                // Remove friend request
                user.friendRequests = user.friendRequests.filter(
                    (request) => request.toString() !== friend_id
                );
                friend.sentFriendRequests = friend.sentFriendRequests.filter(
                    (request) => request.toString() !== user_id
                );

                await user.save();
                await friend.save();

                return res.status(200).json({
                    message: 'Xóa lời mời kết bạn thành công!!!',
                    user: user,
                });
            } else {
                return res.status(400).json({ message: 'Không thể xóa lời mời kết bạn !!!' });
            }
        } catch (err) {
            console.error('Lỗi từ chối yêu cầu kết bạn:', err);
            return res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }

    async cancelFriendRequest(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        const user = await User.findOne({ _id: user_id })
        const friend = await User.findOne({ _id: friend_id })
        console.log('Friend trước khi thu hồi là: ', friend)
        if (user && friend) {
            friend.friendRequests = friend.friendRequests.filter(
                (request) => request.toString() !== user_id
            )
            user.sentFriendRequests = user.sentFriendRequests.filter(
                (request) => request.toString() !== friend_id
            )

            // Save user after removing friend request
            console.log('Friend sau khi thu hồi là: ', friend)
            await friend.save()
            await user.save()

            return res.status(200).json({
                message: 'Huỷ lời mời kết bạn thành công!!!',
                friend: friend,
            })
        } else {
            // in ra lỗi
            res.json('Không thể Huỷ lời mời kết bạn !!!')
        }
    }
    async deleteFriend(req, res) {
        const { userId, friendId } = req.body;

        try {
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);

            if (!user || !friend) {
                return res.status(404).json({ message: 'Người dùng không tồn tại' });
            }

            // Xóa friendId khỏi danh sách bạn bè của user
            user.friend = user.friend.filter(id => id.friend_id !== friendId);
            // Xóa userId khỏi danh sách bạn bè của friend
            friend.friend = friend.friend.filter(id => id.friend_id !== userId);

            await user.save();
            await friend.save();

            return res.status(200).json({ message: 'Đã xóa bạn bè thành công' });
        } catch (err) {
            console.error('Lỗi xóa bạn bè:', err);
            return res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }
    async deleteAccount(req, res) {
        const account_id = req.query.accountID
        try {
            const user = await User.findOne({ account_id: account_id })
            user.deleted = true
            user.deletedAt = Date.now()
            await user.save()
            res.status(200).json('Delete account successfully')
        } catch (error) {
            console.log(error)
            res.status(500).json('Error deleting account')
        }
    }

    //undo delete account
    async undoDeleteAccount(req, res) {
        const account_id = req.query.accountID
        try {
            const user = await User.findOne({ account_id: account_id })
            user.deleted = false
            await user.save()
            res.status(200).json('Undo delete account successfully')
        } catch (error) {
            console.log(error)
            res.status(500).json('Error undo delete account')
        }
    }

    // after 30 day delete account
    async deleteAccountAfter30Days(req, res) {
        const account_id = req.query.account_id
        try {
            const user = await User.findOne({ account_id: account_id })
            user.phoneNumber = user.phoneNumber + 'deleted' + Date.now()
            user.avatar =
                'https://res.cloudinary.com/dpj4kdkxj/image/upload/v1716562765/zfooawvf7n83qtkhh0by.jpg'
            user.userName = 'Tài khoản người dùng'
            res.status(200).json('Delete account successfully')
        } catch (error) {
            console.log(error)
            res.status(500).json('Error deleting account')
        }
    }

    // put /changeNewPhoneNumber
    async changeNewPhoneNumber(req, res) {
        const account_id = req.body.account_id

        const newPhoneNumber = req.body.newPhoneNumber

        const user = await User.findOne({ account_id: account_id })
        if (user) {
            user.phoneNumber = newPhoneNumber
            await user.save()
            res.json('Change new phone number successfully!!!')
        } else {
            res.json('User doesn`t exits !!!')
        }
    }
    async friendRequest(req, res) {
        const { currentUserId, selectedUserId } = req.body
        try {
            //update receiver's friendRequestArray
            await User.findByIdAndUpdate(selectedUserId, {
                $push: { friendRequests: currentUserId },
            })
            //update sender's sentRequestArray
            await User.findByIdAndUpdate(currentUserId, {
                $push: { sentFriendRequests: selectedUserId },
            })
            res.sendStatus(200)
        } catch (err) {
            res.sendStatus(500)
        }
    }

    //-----Mobile
    // Trong UserController.js, thêm hàm này
    async registerMobile(req, res) {
        const { account_id, userName, firstName, lastName, phoneNumber, dateOfBirth, gender, avatar, coverImage } = req.body;

        try {
            // Kiểm tra số điện thoại đã tồn tại
            const existingUser = await User.findOne({ phoneNumber });
            if (existingUser) {
                return res.status(400).json({ message: 'Số điện thoại đã được đăng ký' });
            }

            // Kiểm tra account_id hợp lệ
            const account = await Account.findById(account_id);
            if (!account) {
                return res.status(400).json({ message: 'Tài khoản không tồn tại' });
            }

            // Gán ảnh đại diện mặc định nếu avatar không có hoặc là giá trị mặc định
            const defaultAvatar = (!avatar || avatar === 'https://via.placeholder.com/150')
                ? uploadDefaultAvatar(lastName)
                : avatar;

            const user = new User({
                account_id,
                userName,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                gender,
                avatar: defaultAvatar,
                coverImage: coverImage || null,
            });

            await user.save();
            return res.status(200).json({
                message: 'Đăng ký hồ sơ người dùng thành công!!!',
                user_id: user._id,
                phoneNumber,
            });
        } catch (err) {
            console.error('Lỗi đăng ký hồ sơ người dùng mobile:', err);
            return res.status(500).json({ message: 'Đăng ký hồ sơ người dùng thất bại', error: err.message });
        }
    }
    async friendRequestMobile(req, res) {
        const { currentUserId, selectedUserId } = req.body;
        try {
            const currentUser = await User.findById(currentUserId);
            const selectedUser = await User.findById(selectedUserId);

            if (!currentUser || !selectedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Kiểm tra nếu đã là bạn bè (cả hai chiều)
            const isFriend = currentUser.friend.some(f => f.friend_id === selectedUserId) ||
                selectedUser.friend.some(f => f.friend_id === currentUserId);
            if (isFriend) {
                return res.status(400).json({ message: 'Đã là bạn bè' });
            }

            // Kiểm tra nếu đã gửi yêu cầu
            if (selectedUser.friendRequests.includes(currentUserId)) {
                return res.status(400).json({ message: 'Yêu cầu đã được gửi trước đó' });
            }

            // Thêm vào friendRequests của người nhận
            selectedUser.friendRequests.push(currentUserId);
            // Thêm vào sentFriendRequests của người gửi
            currentUser.sentFriendRequests.push(selectedUserId);

            await selectedUser.save();
            await currentUser.save();

            return res.status(200).json({ message: 'Gửi yêu cầu kết bạn thành công' });
        } catch (err) {
            console.error('Lỗi gửi yêu cầu kết bạn (Mobile):', err);
            return res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }

    async showFriendRequestsMobile(req, res) {
        try {
            const { userId } = req.params;
            // Tìm user theo account_id hoặc _id
            const user = await User.findOne({ $or: [{ _id: userId }, { account_id: userId }] })
                .populate('friendRequests', 'userName phoneNumber avatar')
                .lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json(user.friendRequests || []);
        } catch (error) {
            console.error('Lỗi hiển thị yêu cầu kết bạn (Mobile):', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    async showSentFriendRequestsMobile(req, res) {
        try {
            const { userId } = req.params;
            // Tìm user theo account_id hoặc _id
            const user = await User.findOne({ $or: [{ _id: userId }, { account_id: userId }] })
                .populate('sentFriendRequests', 'userName phoneNumber avatar')
                .lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json(user.sentFriendRequests || []);
        } catch (error) {
            console.error('Lỗi hiển thị yêu cầu đã gửi (Mobile):', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    // Thêm hàm findAllExceptCurrentUser
    async findAllExceptCurrentUser(req, res) {
        try {
            const currentUserId = req.query.currentUserId;
            if (!currentUserId) {
                return res.status(400).json({ message: 'Thiếu currentUserId trong query' });
            }

            const currentUser = await User.findById(currentUserId);
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Lấy danh sách người dùng không phải là bạn bè
            const users = await User.find({
                _id: { $ne: currentUserId },
                friend: { $not: { $elemMatch: { friend_id: currentUserId } } },
            })
                .select('userName phoneNumber avatar friend friendRequests sentFriendRequests')
                .lean();

            if (!users || users.length === 0) {
                return res.status(200).json([]);
            }

            return res.status(200).json(users);
        } catch (err) {
            console.error('Lỗi tìm tất cả người dùng:', err);
            return res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    }

}

export default new UserController()