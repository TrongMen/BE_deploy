import Conversation from '../models/Conversation.js'
import User from '../models/User.js'
import Message from '../models/Message.js';
import { io } from '../../index.js'
import { emitGroupEvent } from '../../util/socketClient.js';

class ConversationController {
    // post createConversationsWeb http://localhost:3001/conversation/createConversationsWeb
    async createConversationsWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id
        if (!user_id || !friend_id) {
            console.log('Không tìm thấy user_id hoặc friend_id!!!')
            return res.status(200).json({
                message: 'Không tìm thấy user_id hoặc friend_id!!!',
            })
        }

        const members = [user_id, friend_id] // sửa từ member thành members

        const conversation = new Conversation({
            members, // sửa từ member thành members
        })
        // kiểm tra trong database xem đã tồn tại conversation nào chứa 2 giá trị trong members chưa
        const checkConversation = await Conversation.find({
            members: { $all: members }, // sửa từ member thành members
        })
        if (checkConversation.length > 0) {
            // console.log('Conversation đã tồn tại!!!')
            return res.status(200).json({
                message: 'Conversation đã tồn tại!!!',
                conversation: checkConversation[0],
            })
        }
        await conversation
            .save()
            .then(() => {
                console.log('Tạo conversation thành công!!!')
                emitGroupEvent(conversation._id, 'new-conversation', { conversation });
                return res.status(200).json({
                    message: 'Tạo conversation thành công!!!',
                    conversation: conversation,
                })
            })
            .catch((err) => {
                console.error(err) // log lỗi
                return res.status(200).json({
                    message: 'Lỗi khi tạo conversation!!!',
                    error: err.message, // thêm chi tiết lỗi
                })
            })
    }

    // api get all conversations từ user_id
    async getConversationsByUserIDWeb(req, res) {
        const user_id = req.body.user_id
        try {
            const conversation = await Conversation.find({
                members: { $all: [user_id] },
            })
            const list_conversation = conversation.map(
                (conversation) => conversation._id
            )
            res.status(200).json({
                message: 'Lấy all conversation thành công!!!',
                conversation: list_conversation,
            })
        } catch (err) {
            res.status(500).json(err)
        }
    }

    // api xây dựng 1 conversation chỉ có 1 thành viên là bản thân giống như cloud của tôi
    async createMyCloudConversationWeb(req, res) {
        //console.log('đã vào createMyCloudConversationWeb')
        const user_id = req.body.user_id
        const conversationName = 'Cloud của tôi'
        const avatar =
            'https://res-zalo.zadn.vn/upload/media/2021/6/4/2_1622800570007_369788.jpg'
        // kiểm tra xem đã có conversation nào có member là user_id và conversationName tên là 'Cloud của tôi' chưa nếu có thì trả về thông báo
        const checkConversation = await Conversation.find({
            members: { $all: [user_id] },
            conversationName: conversationName,
        })
        if (checkConversation.length > 0) {
            return res.status(200).json({
                message: 'ConversationCloud đã tồn tại!!!',
                conversation: checkConversation[0],
            })
        } else {
            const conversation = new Conversation({
                members: [user_id],
                conversationName,
                avatar,
            })
            await conversation
                .save()
                .then(() => {
                    console.log('Tạo conversation thành công!!!')
                    emitGroupEvent(conversation._id, 'new-cloud-conversation', { conversation });

                    return res.status(200).json({
                        message: 'Tạo ConversationCloud thành công!!!',
                        conversation: conversation,
                    })
                })
                .catch((err) => {
                    console.error(err) // log lỗi
                    return res.status(200).json({
                        message: 'Lỗi khi tạo conversation!!!',
                        error: err.message, // thêm chi tiết lỗi
                    })
                })
        }
    }

    //api tạo nhóm trò chuyện
    async createConversationsGroupWeb(req, res) {
        const user_id = req.body.user_id
        const friend_ids = req.body.friend_ids
        const groupLeader = req.body.user_id
        const conversationName = req.body.conversationName

        // Kiểm tra rỗng các id thì trả về lỗi
        if (!user_id || !friend_ids || friend_ids.length === 0) {
            console.log('Không tìm thấy user_id hoặc friend_ids!!!')
            return res.status(200).json({
                message: 'Không tìm thấy user_id hoặc friend_ids!!!',
            })
        }
        const members = [user_id, ...friend_ids]
        const conversation = new Conversation({
            members,
            groupLeader,
            conversationName,
        })

        await conversation
            .save()
            .then(() => {
                console.log('Tạo conversationGroup thành công!!!')
                emitGroupEvent(conversation._id, 'group-created', { conversationName, userName: groupLeaderName });

                return res.status(200).json({
                    message: 'Tạo conversationGroup thành công!!!',
                    conversation: conversation,
                })
            })
            .catch((err) => {
                console.error(err) // log lỗi
                return res.status(200).json({
                    message: 'Lỗi khi tạo conversation!!!',
                    error: err.message, // thêm chi tiết lỗi
                })
            })
    }

    // xây dựng 1 api thêm thành viên nhóm addMemberToConversationGroupWeb
    async addMemberToConversationGroupWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const friend_ids = req.body.friend_ids

        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        // kiểm tra friend_ids đã có trong members chưa nếu có thì trả về thông báo
        const checkMembers = conversation.members.filter((member) =>
            friend_ids.includes(member.toString())
        )
        if (checkMembers.length > 0) {
            return res.status(200).json({
                message: 'Thành viên đã có trong nhóm!!!',
            })
        } else {
            // thêm danh sách friend_ids vào conversation_id
            try {
                const conversation = await Conversation.findOneAndUpdate(
                    { _id: conversation_id },
                    { $push: { members: { $each: friend_ids } } },
                    { new: true }
                )
                if (!conversation) {
                    return res
                        .status(404)
                        .json({ message: 'Conversation not found' })
                }
                // Emit socket event for added members
                emitGroupEvent(conversation_id, 'member-added', { friend_ids });


                return res.status(200).json({
                    message: 'Thêm thành viên vào nhóm thành công!!!',
                    conversation: conversation,
                })
            } catch (error) {
                res.status(500).json({ message: error.message })
            }
        }
    }

    // api xoá thành viên nhóm trong member , nếu
    async removeMemberFromConversationGroupWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        // lấy ra friend_id cần xóa
        const friend_id = req.body.friend_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        console.log('conversation là', conversation)
        if (
            conversation.groupLeader.toString() !== user_id &&
            (conversation.deputyLeader
                ? conversation.deputyLeader.toString() !== user_id
                : true)
        ) {
            return res.status(200).json({
                message: 'Bạn không có quyền xóa thành viên khỏi nhóm!!!',
            })
        } else if (conversation.groupLeader.toString() === friend_id) {
            console.log('Trưởng nhóm không thể bị xóa khỏi nhóm!!!')
            return res.status(200).json({
                message: 'Trưởng nhóm không thể bị xóa khỏi nhóm!!!',
            })
        }

        // xóa friend_id khỏi members
        try {
            const conversation = await Conversation.findOneAndUpdate(
                { _id: conversation_id },
                { $pull: { members: friend_id } },
                { new: true }
            )
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            // Emit socket event for removed member
            emitGroupEvent(conversation_id, 'member-removed', { friend_id });

            return res.status(200).json({
                message: 'Xóa thành viên khỏi nhóm thành công!!!',
                conversation: conversation,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // api gán quyền phó nhóm cho các thành viên khác
    async authorizeDeputyLeaderWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        if (conversation.groupLeader.toString() !== user_id) {
            return res.status(200).json({
                message: 'Bạn không có quyền gán phó nhóm!!!',
            })
        }
        // kiểm tra friend_id đã có trong deputyLeader chưa nếu có thì trả về thông báo
        if (conversation.deputyLeader.includes(friend_id)) {
            return res.status(200).json({
                message: 'Thành viên đã là phó nhóm rồi!!!',
            })
        }
        // kiểm tra firend_id có phải là groupLeader không nếu có thì trả về thông báo
        if (conversation.groupLeader.toString() === friend_id) {
            return res.status(200).json({
                message: 'Thành viên đã là trưởng nhóm rồi!!!',
            })
        }

        // gán quyền phó nhóm cho friend_id
        try {
            const conversation = await Conversation.findOneAndUpdate(
                { _id: conversation_id },
                { $push: { deputyLeader: friend_id } },
                { new: true }
            )
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            emitGroupEvent(conversation_id, 'deputy-assigned', { friend_id });

            return res.status(200).json({
                message: 'Gán quyền phó nhóm thành công!!!',
                conversation: conversation,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // api gán quyền trưởng nhóm cho 1 thành viên khác
    async authorizeGroupLeaderWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        if (conversation.groupLeader.toString() !== user_id) {
            return res.status(200).json({
                message: 'Bạn không có quyền gán trưởng nhóm!!!',
            })
        }
        conversation.groupLeader = friend_id

        // nếu friend_id đã có trong deputyLeader thì xóa friend_id khỏi deputyLeader
        if (conversation.deputyLeader.includes(friend_id)) {
            conversation.deputyLeader = conversation.deputyLeader.filter(
                (deputyLeader) => deputyLeader !== friend_id
            )
        }
        try {
            await conversation.save()
            emitGroupEvent(conversation_id, 'leader-assigned', { friend_id });

            return res.status(200).json({
                message: 'Gán quyền trưởng nhóm thành công!!!',
                conversation: conversation,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // api gỡ quyền phó nhóm deleteDeputyLeaderWeb chỉ dành cho groupLeader
    async deleteDeputyLeaderWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        if (conversation.groupLeader.toString() !== user_id) {
            return res.status(200).json({
                message: 'Bạn không có quyền gỡ quyền phó nhóm!!!',
            })
        }

        // xóa friend_id khỏi deputyLeader
        try {
            const conversation = await Conversation.findOneAndUpdate(
                { _id: conversation_id },
                { $pull: { deputyLeader: friend_id } },
                { new: true }
            )
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            emitGroupEvent(conversation_id, 'deputy-assigned', { friend_id });

            return res.status(200).json({
                message: 'Gỡ quyền phó nhóm thành công!!!',
                conversation: conversation,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // api rời khỏi nhóm cho tât cả thành viên
    async leaveGroupWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        if (conversation.groupLeader.toString() === user_id) {
            return res.status(200).json({
                message: 'Trưởng nhóm không thể rời khỏi nhóm!!!',
            })
        }

        // xóa user_id khỏi members
        try {
            const conversation = await Conversation.findOneAndUpdate(
                { _id: conversation_id },
                { $pull: { members: user_id } },
                { new: true }
            )
            // nếu user_id là phó nhóm thì xóa user_id khỏi deputyLeader
            if (conversation.deputyLeader.includes(user_id)) {
                conversation.deputyLeader = conversation.deputyLeader.filter(
                    (deputyLeader) => deputyLeader !== user_id
                )
            }
            await conversation.save() // Lưu lại thay đổi

            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            emitGroupEvent(conversation_id, 'member-left', { user_id });


            return res.status(200).json({
                message: 'Rời khỏi nhóm thành công!!!',
                conversation: conversation,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // api giản tán nhóm chỉ dành cho groupLeader
    async disbandGroupWeb(req, res) {
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        // tìm Conversation theo conversation_id
        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        if (conversation.groupLeader.toString() !== user_id) {
            return res.status(200).json({
                message: 'Bạn không có quyền giải tán nhóm!!!',
            })
        }

        // sử dụng mongoose-delete để thêm thuộc tính deleted vào conversation
        try {
            await Conversation.delete({ _id: conversation_id })
            emitGroupEvent(conversation_id, 'group-disbanded', {});


            return res.status(200).json({
                message: 'Giải tán nhóm thành công!!!',
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // api lấy tất cả conversation mảng members chứa user_id và members có từ 3 phần tử trở lên
    async getConversationGroupByUserIDWeb(req, res) {
        const user_id = req.body.user_id
        try {
            const conversation = await Conversation.find({
                members: { $all: [user_id] },
            })
            // lọc ra những conversation có thuộc tính là groupLeader với avatar thì mới chọn
            // const conversationGroup = conversation.filter(
            //     (conversation) => conversation.groupLeader
            // )

            // lọc ra những conversation có thuộc tính là groupLeader với avatar và có thuộc tính deleted = null thì mới chọn
            const conversationGroup = conversation.filter(
                (conversation) =>
                    conversation.groupLeader && !conversation.deleted
            )

            res.status(200).json({
                message: 'Lấy conversationGroup thành công!!!',
                conversationGroup: conversationGroup,
            })
        } catch (err) {
            res.status(500).json(err)
        }
    }

    async getConversationIDWeb(req, res) {
        const friend_id = req.body.friend_id
        const user_id = req.body.user_id

        try {
            const conversation = await Conversation.findOne({
                members: { $all: [user_id, friend_id] },
            })

            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }

            return res.status(200).json({
                thongbao: 'Tìm conversation_id thành công!!!',
                conversation_id: conversation._id,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // api lấy danh sách member từ conversation_id
    async getMemberFromConversationIDWeb(req, res) {
        const conversation_id = req.body.conversation_id
        try {
            const conversation = await Conversation.findOne({
                _id: conversation_id,
            })
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            return res.status(200).json({
                message: 'Lấy danh sách thành viên thành công!!!',
                members: conversation.members,
            })
        } catch (error) {
            res.status(200).json({ message: error.message })
        }
    }
    // api lấy id của GroupLeader và lấy mảng danh sách các id của DeputyLeader
    async getGroupLeaderAndDeputyLeaderWeb(req, res) {
        const conversation_id = req.body.conversation_id
        try {
            const conversation = await Conversation.findOne({
                _id: conversation_id,
            })
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            return res.status(200).json({
                message: 'Lấy GroupLeader và DeputyLeader thành công!!!',
                groupLeaderId: conversation.groupLeader,
                deputyLeaderIds: conversation.deputyLeader,
            })
        } catch (error) {
            res.status(200).json({ message: error.message })
        }
    }
    async changeConversationNameWeb(req, res) {
        // console.log('đã vào')
        // res.status(200).json({ message: 'Đổi tên nhóm thành công!!!' })
        const conversation_id = req.body.conversation_id
        const user_id = req.body.user_id
        const conversationName = req.body.conversationName
        // tìm Conversation theo conversation_id
        // từ user_id tìm ra tên của user đổi tên nhóm không cần kiểm tra quyền
        const user = await User.findOne({
            _id: user_id,
        })
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        // tìm ra tên user
        const userName = user.userName

        const conversation = await Conversation.findOne({
            _id: conversation_id,
        })
        conversation.conversationName = conversationName
        try {
            await conversation.save()
            emitGroupEvent(conversation_id, 'group-renamed', { conversationName, userName });


            return res.status(200).json({
                message: 'Đổi tên nhóm thành công!!!',
                userChangeName: userName,
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }


    // adđ mobile-------------------------
    async createConversation(req, res) {
        const newConversation = new Conversation({
            members: [req.body.senderId, req.body.receiverId],
        })
        try {
            const result = await newConversation.save()
            //res.status(200).json(result)
        } catch (err) {
            res.status(500).json(err)
        }
    }
    async userConversations(req, res) {
        try {
            const conversation = await Conversation.find({
                members: { $in: [req.params.userId] },
            })
            res.status(200).json(conversation)
        } catch (err) {
            res.status(500).json(err)
        }
    }
    async findConversations(req, res) {
        try {
            const conversation = await Conversation.findOne({
                members: { $all: [req.params.firstId, req.params.secondId] },
            })
            res.status(200).json(conversation)
        } catch (err) {
            res.status(500).json(err)
        }
    }
    //find conversation by conversation_id mobile
    async findConversationById(req, res) {
        try {
            const conversation = await Conversation.findOne({
                _id: req.params.conversationId,
            })
            res.status(200).json(conversation)
        } catch (err) {
            res.status(500).json(err)
        }
    }
    //api tạo nhóm trò chuyện
    async createConversationsGroupMobile(req, res) {
        try {
            const { members, conversationName, avatar, groupLeader } = req.body;
            if (!members || members.length < 3) {
                return res.status(400).json({ message: 'Nhóm phải có ít nhất 3 thành viên' });
            }
            if (!conversationName) {
                return res.status(400).json({ message: 'Tên nhóm là bắt buộc' });
            }
            if (!groupLeader || !members.includes(groupLeader)) {
                return res.status(400).json({ message: 'Trưởng nhóm phải là một thành viên' });
            }

            // Kiểm tra tất cả members tồn tại
            const users = await User.find({ _id: { $in: members } });
            if (users.length !== members.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều thành viên không tồn tại' });
            }

            const conversation = new Conversation({
                members,
                conversationName,
                avatar: avatar || 'https://via.placeholder.com/50',
                groupLeader,
                deputyLeader: [],
            });

            await conversation.save();

            // Cập nhật conversation_id cho tất cả thành viên
            await User.updateMany(
                { _id: { $in: members } },
                { $push: { conversation_id: { conversation_id: conversation._id } } }
            );

            const leader = await User.findById(groupLeader);
            if (!leader) {
                throw new Error('Không tìm thấy trưởng nhóm');
            }

            const message = new Message({
                conversation_id: conversation._id,
                senderId: groupLeader,
                contentType: 'notify',
                content: `Nhóm "${conversationName}" đã được tạo bởi ${leader.userName}`,
            });
            await message.save();

            io.to(conversation._id).emit('group-event', {
                conversation_id: conversation._id,
                event: 'group-created',
                data: { conversationName, userName: leader.userName },
            });

            res.status(200).json({ conversation });
        } catch (err) {
            console.error('Lỗi tạo nhóm (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async addMemberToConversationGroupMobile(req, res) {
        try {
            const { conversation_id, member_ids, user_id } = req.body;
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            // Kiểm tra danh sách member_ids
            const newMembers = await User.find({ _id: { $in: member_ids } });
            if (newMembers.length !== member_ids.length) {
                return res.status(404).json({ message: 'Một hoặc nhiều thành viên không tồn tại' });
            }

            // Kiểm tra thành viên đã có trong nhóm
            const alreadyMembers = member_ids.filter(id => conversation.members.includes(id));
            if (alreadyMembers.length > 0) {
                return res.status(400).json({ message: 'Một số người dùng đã là thành viên' });
            }

            if (
                conversation.groupLeader.toString() !== user_id &&
                !conversation.deputyLeader.includes(user_id)
            ) {
                return res.status(403).json({ message: 'Bạn không có quyền thêm thành viên' });
            }

            // Thêm tất cả member_ids vào nhóm
            conversation.members.push(...member_ids);
            await conversation.save();

            // Cập nhật conversation_id cho các thành viên mới
            await User.updateMany(
                { _id: { $in: member_ids } },
                { $push: { conversation_id: { conversation_id: conversation._id } } }
            );

            // Tạo thông báo cho từng thành viên
            for (const member_id of member_ids) {
                const newMember = await User.findById(member_id);
                const message = new Message({
                    conversation_id,
                    senderId: user_id,
                    contentType: 'notify',
                    content: `${newMember.userName} đã được ${user.userName} thêm vào nhóm`,
                });
                await message.save();
            }

            emitGroupEvent(conversation_id, 'member-added', { member_ids });


            res.status(200).json({ message: 'Thêm thành viên thành công', conversation });
        } catch (err) {
            console.error('Lỗi thêm thành viên (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async removeMemberFromConversationGroupMobile(req, res) {
        try {
            const { conversation_id, member_id, user_id } = req.body;
            if (!user_id) {
                return res.status(400).json({ message: 'Thiếu user_id của người thực hiện hành động' });
            }

            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            const removedMember = await User.findById(member_id);
            if (!removedMember) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng cần xóa' });
            }

            if (!conversation.members.includes(member_id)) {
                return res.status(400).json({ message: 'Người dùng không phải thành viên' });
            }

            if (conversation.groupLeader.toString() === member_id) {
                return res.status(400).json({ message: 'Không thể xóa trưởng nhóm' });
            }

            if (
                conversation.groupLeader.toString() !== user_id &&
                !conversation.deputyLeader.includes(user_id)
            ) {
                return res.status(403).json({ message: 'Bạn không có quyền xóa thành viên' });
            }

            conversation.members = conversation.members.filter((id) => id.toString() !== member_id);
            conversation.deputyLeader = conversation.deputyLeader.filter((id) => id.toString() !== member_id);
            await conversation.save();

            // Xóa conversation_id khỏi user bị xóa
            await User.updateOne(
                { _id: member_id },
                { $pull: { conversation_id: { conversation_id: conversation._id } } }
            );

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${removedMember.userName} đã bị ${user.userName} xóa khỏi nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'member-removed', {
                userId: member_id,
                userName: removedMember.userName,
            });


            res.status(200).json({ message: 'Xóa thành viên thành công', conversation });
        } catch (err) {
            console.error('Lỗi xóa thành viên (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async authorizeDeputyLeader(req, res) {
        try {
            const { conversation_id, member_id, user_id } = req.body; // Thêm user_id để kiểm tra quyền
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            const newDeputy = await User.findById(member_id);
            if (!newDeputy) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng cần gán quyền' });
            }

            if (!conversation.members.includes(member_id)) {
                return res.status(400).json({ message: 'Người dùng không phải thành viên' });
            }

            if (conversation.deputyLeader.includes(member_id)) {
                return res.status(400).json({ message: 'Người dùng đã là phó nhóm' });
            }

            if (conversation.groupLeader.toString() === member_id) {
                return res.status(400).json({ message: 'Người dùng đã là trưởng nhóm' });
            }

            if (conversation.groupLeader.toString() !== user_id) {
                return res.status(403).json({ message: 'Bạn không có quyền gán phó nhóm' });
            }

            conversation.deputyLeader.push(member_id);
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${newDeputy.userName} đã được ${user.userName} bổ nhiệm làm Phó nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'deputy-assigned', {
                userId: member_id,
                userName: newDeputy.userName,
            });


            res.status(200).json({ message: 'Gán quyền phó nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi gán quyền phó nhóm:', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
    // api hủy quyền phó nhóm cho các thành viên khác
    async unauthorizeDeputyLeader(req, res) {
        try {
            const { conversation_id, member_id, user_id } = req.body; // Thêm user_id để kiểm tra quyền
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            const removedDeputy = await User.findById(member_id);
            if (!removedDeputy) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng cần gỡ quyền' });
            }

            if (!conversation.deputyLeader.includes(member_id)) {
                return res.status(400).json({ message: 'Người dùng không phải phó nhóm' });
            }

            if (conversation.groupLeader.toString() !== user_id) {
                return res.status(403).json({ message: 'Bạn không có quyền gỡ quyền phó nhóm' });
            }

            conversation.deputyLeader = conversation.deputyLeader.filter((id) => id.toString() !== member_id);
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${removedDeputy.userName} đã bị ${user.userName} gỡ quyền phó nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'deleteDeputyLeader', { userName: removedDeputy.userName });


            res.status(200).json({ message: 'Gỡ quyền phó nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi gỡ quyền phó nhóm:', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async authorizeGroupLeader(req, res) {
        try {
            const { conversation_id, member_id, user_id } = req.body; // Thêm user_id để kiểm tra quyền
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            const newLeader = await User.findById(member_id);
            if (!newLeader) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng cần gán quyền' });
            }

            if (!conversation.members.includes(member_id)) {
                return res.status(400).json({ message: 'Người dùng không phải thành viên' });
            }

            if (conversation.groupLeader.toString() !== user_id) {
                return res.status(403).json({ message: 'Bạn không có quyền gán trưởng nhóm' });
            }

            conversation.groupLeader = member_id;
            conversation.deputyLeader = conversation.deputyLeader.filter((id) => id.toString() !== member_id);
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${newLeader.userName} đã được ${user.userName} chuyển quyền trưởng nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'leader-assigned', {
                userId: member_id,
                userName: newLeader.userName,
            });


            res.status(200).json({ message: 'Gán quyền trưởng nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi gán quyền trưởng nhóm:', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async disbandGroupMobile(req, res) {
        try {
            const { conversation_id, user_id } = req.body;
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người thực hiện hành động' });
            }

            if (conversation.groupLeader.toString() !== user_id) {
                return res.status(403).json({ message: 'Bạn không có quyền giải tán nhóm' });
            }

            await conversation.delete();
            await Message.deleteMany({ conversation_id });

            emitGroupEvent(conversation_id, 'group-disbanded', {});


            res.status(200).json({ message: 'Giải tán nhóm thành công' });
        } catch (err) {
            console.error('Lỗi giải tán nhóm (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
    async leaveGroupMobile(req, res) {
        try {
            const { conversation_id, user_id } = req.body;
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            if (conversation.groupLeader.toString() === user_id) {
                return res.status(400).json({ message: 'Trưởng nhóm không thể rời khỏi nhóm' });
            }

            if (!conversation.members.includes(user_id)) {
                return res.status(400).json({ message: 'Bạn không phải thành viên của nhóm' });
            }

            conversation.members = conversation.members.filter((id) => id.toString() !== user_id);
            conversation.deputyLeader = conversation.deputyLeader.filter((id) => id.toString() !== user_id);
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${user.userName} đã rời khỏi nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'exit', { userName: user.userName });


            res.status(200).json({ message: 'Rời khỏi nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi rời nhóm (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async changeGroupNameMobile(req, res) {
        try {
            const { conversation_id, conversationName, user_id } = req.body;
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            if (
                conversation.groupLeader.toString() !== user_id &&
                !conversation.deputyLeader.includes(user_id)
            ) {
                return res.status(403).json({ message: 'Bạn không có quyền đổi tên nhóm' });
            }

            conversation.conversationName = conversationName;
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `Tên nhóm đã được ${user.userName} thay đổi thành ${conversationName}`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'rename', { userName: user.userName, conversationName });


            res.status(200).json({ message: 'Đổi tên nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi đổi tên nhóm (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async updateConversationAvatarMobile(req, res) {
        try {
            const { conversation_id, avatar, user_id } = req.body;
            const conversation = await Conversation.findById(conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy nhóm' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            if (
                conversation.groupLeader.toString() !== user_id &&
                !conversation.deputyLeader.includes(user_id)
            ) {
                return res.status(403).json({ message: 'Bạn không có quyền cập nhật avatar nhóm' });
            }

            conversation.avatar = avatar;
            await conversation.save();

            const message = new Message({
                conversation_id,
                senderId: user_id,
                contentType: 'notify',
                content: `${user.userName} đã cập nhật avatar nhóm`,
            });
            await message.save();

            emitGroupEvent(conversation_id, 'avatar-updated', { userName: user.userName, avatar });


            res.status(200).json({ message: 'Cập nhật avatar nhóm thành công', conversation });
        } catch (err) {
            console.error('Lỗi cập nhật avatar nhóm (Mobile):', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
    async getConversationsByUserIDMobile(req, res) {
        try {
            const user_id = req.body.user_id;
            if (!user_id) {
                return res.status(400).json({ message: 'Thiếu user_id trong body' });
            }

            const user = await User.findById(user_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            const conversationIds = user.conversation_id?.map(conv => conv.conversation_id) || [];
            if (!conversationIds.length) {
                return res.status(200).json({
                    message: 'Lấy all conversation thành công!!!',
                    conversation: [],
                });
            }

            const conversations = await Conversation.find({
                _id: { $in: conversationIds },
                deleted: false,
            }).lean();

            res.status(200).json({
                message: 'Lấy all conversation thành công!!!',
                conversation: conversations.map(conv => conv._id),
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách cuộc trò chuyện (Mobile):', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
    }

    async getConversationById(req, res) {
        try {
            const conversation = await Conversation.findById(req.params.conversation_id);
            if (!conversation) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }
            res.status(200).json({ conversation });
        } catch (err) {
            console.error('Lỗi lấy thông tin cuộc trò chuyện:', err);
            res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
    //-------------------

    // api check conversation có phải là nhóm  hay chưa dựa vào conversation đó có thuộc tính groupLeader hay không hoặc có conversationName hay không
    async checkGroupWeb(req, res) {
        const conversation_id = req.body.conversation_id
        try {
            const conversation = await Conversation.findOne({
                _id: conversation_id,
            })
            if (!conversation) {
                return res
                    .status(404)
                    .json({ message: 'Conversation not found' })
            }
            if (
                conversation.groupLeader ||
                (conversation.conversationName &&
                    conversation.conversationName !== 'Cloud của tôi')
            ) {
                return res.status(200).json({
                    message: 'Conversation là nhóm!!!',
                })
            } else {
                return res.status(200).json({
                    message: 'Conversation không phải là nhóm!!!',
                })
            }
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }
    // viết 1 api lấy tin nhắn cuối cùng của conversation nếu mà là của user mình nhắn sẽ hiện àlaf "Bạn : message" còn néu của người khác thì hiện là "userName : message"

    // viết 1 api check nhóm chung giữa user_id và friend_id ta sẽ check xem 2 user_id và friend_id có chung 1 nhóm nào không nếu có thì trả về số lượng nhóm chung và tên nhóm cùng với avatar của nhóm
    async checkGroupCommonWeb(req, res) {
        const user_id = req.body.user_id
        const friend_id = req.body.friend_id

        // chỉ check conversation có thuộc tính groupLeader và conversationName và thuộc tính deleted = false
        const conversation = await Conversation.find({
            members: { $all: [user_id, friend_id] },
            groupLeader: { $ne: null },
            conversationName: { $ne: null },
            deleted: false,
        })
        if (conversation.length === 0) {
            return res.status(200).json({
                message: 'Không có nhóm chung!!!',
            })
        }
        return res.status(200).json({
            message: 'Có nhóm chung!!!',

            conversation: conversation,
            // trả về số lượng nhóm chung
            conversationCount: conversation.length,
        })
    }
}


export default new ConversationController()
