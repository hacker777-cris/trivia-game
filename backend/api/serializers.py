from rest_framework import serializers
from .models import GameRoom, PlayerAnswer, PlayerInRoom, Player


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "username"]


class PlayerInRoomSerializer(serializers.ModelSerializer):
    player = serializers.StringRelatedField()

    class Meta:
        model = PlayerInRoom
        fields = ["player", "score", "eliminated"]


class RoomSerializer(serializers.ModelSerializer):
    host = serializers.StringRelatedField()
    player_count = serializers.SerializerMethodField()

    class Meta:
        model = GameRoom
        fields = ["code", "host", "is_private", "is_active", "started", "player_count"]

    def get_player_count(self, obj):
        return obj.players.count()


class DetailedRoomSerializer(serializers.ModelSerializer):
    host = serializers.StringRelatedField()
    players = PlayerInRoomSerializer(source="players.all", many=True)

    class Meta:
        model = GameRoom
        fields = ["code", "host", "is_private", "is_active", "started", "players"]


class PlayerAnswerSerializer(serializers.Serializer):
    selected_option = serializers.ChoiceField(choices=["A", "B", "C", "D"])


class CreateRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameRoom
        fields = ["is_private"]
