import React, { useState, useEffect } from 'react';
import SoulChatList from './SoulChatList';
import SoulChatRoom from './SoulChatRoom';

const SoulChatContainer = ({ user, onGoToSoul, externalPartner, onClearExternal }) => {
    const [selectedPartner, setSelectedPartner] = useState(null);

    useEffect(() => {
        if (externalPartner) {
            setSelectedPartner(externalPartner);
            if (onClearExternal) onClearExternal();
        }
    }, [externalPartner, onClearExternal]);

    return (
        <div className="page-content soul-chat-container">
            {!selectedPartner ? (
                <SoulChatList
                    user={user}
                    onSelectChat={(partner) => setSelectedPartner(partner)}
                    onGoToSoul={onGoToSoul}
                />
            ) : (
                <SoulChatRoom
                    user={user}
                    partner={selectedPartner}
                    onBack={() => setSelectedPartner(null)}
                />
            )}

            <style>{`
                .soul-chat-container {
                    padding-bottom: 100px;
                }
            `}</style>
        </div>
    );
};

export default SoulChatContainer;
