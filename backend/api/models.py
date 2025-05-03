from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils.crypto import get_random_string


class PlayerManager(BaseUserManager):
    def create_user(self, username):
        if not username:
            raise ValueError("Players must have a username")
        player = self.model(username=username)
        player.set_unusable_password()
        player.save(using=self._db)
        return player

    def create_superuser(self, username, password=None):
        user = self.create_user(username)
        user.is_staff = True
        user.is_superuser = True
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user


class Player(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=32, unique=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Add related_name to avoid clashes
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name="groups",
        blank=True,
        related_name="player_set",
        help_text="The groups this player belongs to. A player will get all permissions granted to each of their groups.",
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name="user permissions",
        blank=True,
        related_name="player_set",
        help_text="Specific permissions for this player.",
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    objects = PlayerManager()

    def __str__(self):
        return self.username


def generate_room_code():
    """Generate a random 6-character uppercase code for game rooms."""
    return get_random_string(6).upper()


class GameRoom(models.Model):
    host = models.ForeignKey(
        Player, on_delete=models.CASCADE, related_name="hosted_rooms"
    )
    code = models.CharField(max_length=6, unique=True, default=generate_room_code)
    is_private = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    started = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Room {self.code}"


class PlayerInRoom(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE)
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="players")
    score = models.IntegerField(default=0)
    eliminated = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player.username} in {self.room.code}"


class Question(models.Model):
    text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)
    correct_option = models.CharField(
        max_length=1, choices=[("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")]
    )

    def __str__(self):
        return self.text[:50]


class GameRound(models.Model):
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="rounds")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    round_number = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Round {self.round_number} in {self.room.code}"


class PlayerAnswer(models.Model):
    player = models.ForeignKey(PlayerInRoom, on_delete=models.CASCADE)
    round = models.ForeignKey(
        GameRound, on_delete=models.CASCADE, related_name="answers"
    )
    selected_option = models.CharField(
        max_length=1, choices=[("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")]
    )
    is_correct = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)
