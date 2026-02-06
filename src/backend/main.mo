import Array "mo:core/Array";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Notes functionality
  public type Note = {
    id : Nat;
    owner : Principal;
    title : Text;
    extractedText : Text;
    createdAt : Int;
  };

  module Note {
    public func compareByCreatedAt(note1 : Note, note2 : Note) : Order.Order {
      Int.compare(note2.createdAt, note1.createdAt);
    };
  };

  let notes = Map.empty<Nat, Note>();
  var nextId = 0;

  public shared ({ caller }) func createNote(title : Text, extractedText : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create notes");
    };
    let note : Note = {
      id = nextId;
      owner = caller;
      title;
      extractedText;
      createdAt = Time.now();
    };
    notes.add(nextId, note);
    nextId += 1;
    note.id;
  };

  public query ({ caller }) func getNotes() : async [Note] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notes");
    };
    // Return only the caller's own notes
    notes.values().toArray().filter(
      func(note) {
        note.owner == caller;
      }
    ).sort(Note.compareByCreatedAt);
  };

  public query ({ caller }) func getNotesByOwner(owner : Principal) : async [Note] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notes");
    };
    // Users can only view their own notes, admins can view any user's notes
    if (caller != owner and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own notes");
    };
    notes.values().toArray().filter(
      func(note) {
        note.owner == owner;
      }
    ).sort(Note.compareByCreatedAt);
  };

  public shared ({ caller }) func deleteNote(noteId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete notes");
    };
    switch (notes.get(noteId)) {
      case (null) {
        Runtime.trap("Note not found");
      };
      case (?note) {
        if (note.owner != caller) {
          Runtime.trap("Unauthorized: Only the owner can delete this note");
        };
        notes.remove(noteId);
      };
    };
  };
};
