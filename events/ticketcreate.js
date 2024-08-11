const { Events, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const logChannelId = '1271365805644189737'; 
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        try {
            if (interaction.isStringSelectMenu()) {
                await interaction.deferReply({ ephemeral: true });

                if (interaction.customId === 'ticket_select') {
                    const selectedOption = interaction.values[0];
                    let ticketChannel;
                    let ticketDescription = '';

                    const generalStaffRoleId = '1250786185677242463'; 
                    const staffReportRoleId = '11260908876577116212'; 
                    const categoryID = '1271349943319265311'; 
                    const openTime = Math.floor(Date.now() / 1000);

                    const roles = {
                        'staff_report': staffReportRoleId,
                        'civ_report': generalStaffRoleId,
                        'general_support': generalStaffRoleId
                    };

                    const roleId = roles[selectedOption];
                    if (!roleId) return;

                    const role = interaction.guild.roles.cache.get(roleId);
                    if (!role) {
                        throw new Error(`Role with ID ${roleId} not found`);
                    }

                    const permissionOverwrites = [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                        { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                    ];

                    switch (selectedOption) {
                        case 'staff_report':
                            ticketDescription = 'Thank you for submitting a staff report ticket. Our staff team will reach back to you shortly. While you wait, please provide information about the staff and proof of their actions.';
                            break;
                        case 'civ_report':
                            ticketDescription = 'Thank you for submitting a civilian report ticket. Our staff team will reach back to you shortly. While you wait, please provide information about the civilian and evidence of their actions.';
                            break;
                        case 'general_support':
                            ticketDescription = 'Thank you for submitting a general support ticket. Our staff team will reach back to you shortly. While you wait, please provide details about why you opened this ticket.';
                            break;
                    }

                    ticketChannel = await interaction.guild.channels.create({
                        name: `${selectedOption.replace('_', '-')}-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        parent: categoryID,
                        topic: `Created by: ${interaction.user.id} | Opened at: ${openTime}`, 
                        permissionOverwrites
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle('H9GVRP | Ticket Opened')
                        .setDescription(ticketDescription)
                        .setColor(`#89cff0`);

                    const closeButton = new ButtonBuilder()
                        .setCustomId('close_with_reason')
                        .setLabel('🔒 Close with Reason')
                        .setStyle(ButtonStyle.Danger);

                    const buttonRow = new ActionRowBuilder().addComponents(closeButton);

                    await ticketChannel.send({
                        content: `${interaction.user}, <@&${roleId}>`,
                        embeds: [ticketEmbed],
                        components: [buttonRow]
                    });

                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('Ticket Created')
                            .setDescription(`Ticket created by ${interaction.user} (${interaction.user.id})`)
                            .addFields(
                                { name: 'Ticket Type', value: selectedOption },
                                { name: 'Ticket Channel', value: ticketChannel.toString() },
                                { name: 'Open Time', value: `<t:${openTime}:f>` }
                            )
                            .setColor(`#89cff0`);
                        await logChannel.send({ embeds: [logEmbed] });
                    }

                    await interaction.editReply({ content: `Ticket created: ${ticketChannel}` });
                }
            } else if (interaction.isButton()) {
                if (interaction.customId === 'close_with_reason') {
                    const modal = new ModalBuilder()
                        .setCustomId('close_with_reason_modal')
                        .setTitle('Close Ticket with Reason');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('close_reason_input')
                        .setLabel('Reason for closing the ticket')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
                    modal.addComponents(firstActionRow);

                    await interaction.showModal(modal);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'close_with_reason_modal') {
                    const reason = interaction.fields.getTextInputValue('close_reason_input');
                    const channelTopic = interaction.channel.topic || '';
                    const openTimeStr = channelTopic.split(' | ')[1]?.split('Opened at: ')[1];
                    const openTime = openTimeStr ? parseInt(openTimeStr) : Math.floor(Date.now() / 1000); 
                    const closeTime = Math.floor(Date.now() / 1000);

                    const ticketCloseEmbed = new EmbedBuilder()
                        .setTitle('H9GVRP | Ticket Closed')
                        .setDescription(`Dear <@${channelTopic.split('Created by: ')[1]?.split(' | ')[0]}>, your ticket has now been closed.`)
                        .addFields(
                            { name: 'Ticket Open time', value: `<t:${openTime}:f>` },
                            { name: 'Ticket Close time', value: `<t:${closeTime}:f>` },
                            { name: 'Close Reason', value: reason }
                        )
                        .setColor(`#89cff0`);

                    const ticketCreatorId = channelTopic.split('Created by: ')[1]?.split(' | ')[0];
                    const ticketCreator = interaction.guild.members.cache.get(ticketCreatorId);
                    if (ticketCreator) {
                        try {
                            await ticketCreator.send({ embeds: [ticketCloseEmbed] });
                        } catch (error) {
                            console.error(`Failed to send DM to ticket creator: ${error.message}`);
                        }
                    } else {
                        console.error('Ticket creator not found.');
                    }

                    await interaction.channel.send('This ticket is now closed.');

                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('Ticket Closed with Reason')
                            .setDescription(`Ticket closed by ${interaction.user} (${interaction.user.id})`)
                            .addFields(
                                { name: 'Ticket Channel', value: interaction.channel.toString() },
                                { name: 'Close Time', value: `<t:${closeTime}:f>` },
                                { name: 'Close Reason', value: reason }
                            )
                            .setColor(`#89cff0`);
                        await logChannel.send({ embeds: [logEmbed] });
                    }

                    setTimeout(async () => {
                        await interaction.channel.delete();
                    }, 5000);
                }
            }
        } catch (error) {
            console.error(`Error handling interaction: ${error.message}`);
            await interaction.reply({ content: 'There was an error while processing your request.', ephemeral: true });
        }
    },
};