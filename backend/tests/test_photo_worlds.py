import hashlib
import io
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

from app.api import photo_worlds, photo_world_activities as activities
from app.main import create_app

BASE="/api/v1/photo-worlds"


def image_bytes():
    buf=io.BytesIO()
    Image.new("RGB",(100,75),"#997766").save(buf,"PNG")
    return buf.getvalue()


def bearer(secret):
    return {"Authorization":"Bearer "+secret}


def create_room(c):
    r=c.post(BASE,data={"title":"当时在场","consent":"true"},files={"photo":("group.png",image_bytes(),"image/png")})
    assert r.status_code==201,r.text
    return r.json()


def claim(c,route,access,key,x,name):
    return c.post(route+"/claim",headers=bearer(access),json={
        "member_key":key,"x":x,"y":.45,"name":name,"about":name+"喜欢旅行与摄影。"})


def test_claims_media_privacy_and_continuity(tmp_path,monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *a:[])
    with TestClient(create_app()) as c:
        room=create_room(c)
        path=BASE+"/"+room["id"]
        assert c.get(path).status_code==404
        assert c.get(path+"/photo",headers=bearer(room["invite"])).content.startswith(b"\xff\xd8")
        a,b,e="a"*48,"b"*48,"e"*48
        assert claim(c,path,room["host"],a,.2,"小禾").json()=={"seat":0}
        assert claim(c,path,room["host"],a,.2,"重复").json()=={"seat":0}
        assert claim(c,path,room["invite"],e,.2,"重复的人").status_code==409
        assert claim(c,path,room["invite"],b,.55,"小林").json()=={"seat":1}
        assert claim(c,path,room["invite"],e,.85,"小宁").json()=={"seat":2}
        assert "name" not in c.get(path,headers=bearer(room["invite"])).json()["people"][0]
        fd={"id":"birthday-0001","kind":"birthday","happened":"2026-08-12","title":"生日","body":"自述原文"}
        for _ in range(2):
            assert c.post(path+"/moments",headers=bearer(a),data=fd,files={"photo":("p.png",image_bytes(),"image/png")}).status_code==201
        assert c.post(path+"/moments",headers=bearer(b),data=fd).status_code==409
        assert c.get(path+"/sources/group",headers=bearer(room["invite"])).status_code==403
        for ref in ("group","moment-birthday-0001"):
            source=c.get(path+"/sources/"+ref,headers=bearer(b))
            assert source.content==image_bytes() and source.headers["x-content-sha256"]==hashlib.sha256(image_bytes()).hexdigest()
        c.put(path+"/people/1/impression",headers=bearer(a),json={"text":"私人印象"})
        assert c.get(path,headers=bearer(e)).json()["impressions"]==[]
        assert c.put(path+"/presence",headers=bearer(b),json={"x":1,"z":3,"posture":"sit"}).status_code==200
    with TestClient(create_app()) as c:
        data=c.get(path,headers=bearer(b)).json()
        assert data["me"]==1 and data["people"][1]["posture"]=="sit"
        assert len(data["moments"])==1 and data["moments"][0]["body"]=="自述原文"
        assert data["impressions"][0]["text"]=="私人印象"
        assert c.get(path+"/moments/birthday-0001/photo",headers=bearer(b)).status_code==200


def test_atomic_seat_game_screen_and_source_based_roundtable(tmp_path,monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *a:[])
    with TestClient(create_app()) as c:
        room=create_room(c)
        route=BASE+"/"+room["id"]
        keys=["a"*48,"b"*48]
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses=list(pool.map(lambda key:claim(c,route,room["invite"],key,.24,"小禾"), keys))
        assert sorted(r.status_code for r in responses)==[200,409]
        a=keys[[r.status_code for r in responses].index(200)]
        b="c"*48
        assert claim(c,route,room["invite"],b,.65,"小林").status_code==200
        game=c.post(route+"/ice",headers=bearer(a),json={"subject":1,"text":"喜欢摄影"}).json()
        vpath=route+"/ice/"+game["id"]+"/vote"
        assert c.get(route+"/ice",headers=bearer(b)).json()["cards"][0]["subject"] is None
        assert c.put(vpath,headers=bearer(a),json={"seat":1}).status_code==409
        c.put(vpath,headers=bearer(b),json={"seat":1});c.put(vpath,headers=bearer(b),json={"seat":0})
        card=c.get(route+"/ice",headers=bearer(b)).json()["cards"][0]
        assert (card["subject"],card["pick"],card["votes"])==(1,1,1)
        screen=c.post(route+"/screen",headers=bearer(a)).json()["key"]
        snapshot=c.get(route+"/screen",headers=bearer(screen)).json()
        assert len(snapshot["people"])==2 and "about" not in snapshot["people"][0]
        assert c.get(route+"/photo",headers=bearer(screen)).status_code==404
        assert c.post(route+"/campfire",headers=bearer(a),json={"topic":"再相见"}).status_code==409
        for k in [a,b]:
            assert c.put(route+"/agent-consent",headers=bearer(k),json={"consent":True}).status_code==200
        discussion=c.post(route+"/campfire",headers=bearer(a),json={"topic":"再相见"}).json()
        assert discussion["method"]=="source" and len(discussion["turns"])==2
        assert c.get(route,headers=bearer(b)).json()["discussions"][0]["topic"]=="再相见"
        assert c.put(route+"/me/introduction",headers=bearer(room["invite"]),json={"about":"变更"}).status_code == 403
        assert c.put(route+"/me/introduction",headers=bearer(b),json={"about":"现在喜欢骑车。"}).status_code == 200
        updated = c.get(route,headers=bearer(b)).json()["people"][1]
        assert updated["about"] == "现在喜欢骑车。" and not updated["agent_enabled"]
        c.put(route+"/agent-consent",headers=bearer(b),json={"consent":False})
        assert c.post(route+"/campfire",headers=bearer(a),json={"topic":"再相见"}).status_code==409


def test_no_external_portrait_without_opt_in_and_unavailable_is_honest(tmp_path,monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *a:[])
    monkeypatch.setattr(activities,"world_atlas",lambda *a,**kw: (_ for _ in ()).throw(RuntimeError("offline")))
    with TestClient(create_app()) as c:
        room=create_room(c);route=BASE+"/"+room["id"];a="a"*48
        claim(c,route,room["invite"],a,.3,"小禾")
        assert c.post(route+"/portrait",headers=bearer(a),json={"consent":False}).status_code==422
        assert c.post(route+"/portrait",headers=bearer(a),json={"consent":True}).status_code==200
        assert c.get(route,headers=bearer(a)).json()["people"][0]["portrait"]=="unavailable"
        assert c.get(route+"/people/0/portrait",headers=bearer(a)).status_code==200


def test_model_prompt_turns_are_grounded_in_residents_own_words(monkeypatch):
    people=[{"seat":1,"about":"喜欢走山路"},{"seat":2,"about":"会拍照片"}]
    import json
    def response(quote):
        return SimpleNamespace(mock=False,text=json.dumps({"turns":[{"seat":1,"quote":quote,"question":"想先去哪里走山路？"},{"seat":2,"quote":"拍照片","question":"谁想带相机？"}]}))
    monkeypatch.setattr(activities,"interactive_json_chat",lambda *a:response("走山路"))
    assert activities.openers("出行",people)[0]=="model"
    monkeypatch.setattr(activities,"interactive_json_chat",lambda *a:response("已答应"))
    assert activities.openers("出行",people)[0]=="source"



def test_five_seats_two_shared_venues_and_pair_scoped_memories(tmp_path,monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *a:[])
    with TestClient(create_app()) as c:
        room=create_room(c);path=BASE+"/"+room["id"]
        keys=[str(i)*48 for i in range(5)]
        for i,k in enumerate(keys):
            assert claim(c,path,room["invite"],k,.12+i*.18,"成员"+str(i)).status_code==200
        assert len(c.get(path,headers=bearer(keys[4])).json()["people"])==5
        fd={"id":"journey-0001","kind":"trip","happened":"2026-09-12","title":"爬山","with_people":"1"}
        assert c.post(path+"/moments",headers=bearer(keys[0]),data=fd).status_code==201
        assert c.get(path+"/fields/1",headers=bearer(keys[0])).json()["moments"]==["journey-0001"]
        assert c.get(path+"/fields/4",headers=bearer(keys[0])).json()["moments"]==[]
        assert c.get(path+"/fields/1",headers=bearer(room["invite"])).status_code==403
        c.put(path+"/presence",headers=bearer(keys[1]),json={"x":0,"z":1.57,"posture":"sit","place":"cafe"})
        snapshot=c.get(path,headers=bearer(keys[0])).json()
        assert snapshot["people"][1]["place"]=="cafe" and snapshot["people"][0]["place"]=="hall"
        assert snapshot["moments"][0]["with_people"]==[1]


def test_local_and_generated_looks_share_the_original_voxel_uv_contract():
    import base64
    from PIL import ImageDraw
    from app.pipeline.world_portrait import world_atlas
    tile = Image.new("RGB",(64,64),"#ba9566")
    ImageDraw.Draw(tile).rectangle((8,25,19,33), fill="#382923")
    buf=io.BytesIO();tile.save(buf,"PNG")
    result=SimpleNamespace(mock=False,text=base64.b64encode(buf.getvalue()).decode())
    prompts=[]
    def render(prompt, images):
        prompts.append(prompt)
        assert len(images)==1 and images[0].startswith(bytes.fromhex("FFD8"))
        return result
    box={"x":.1,"y":.1,"width":.4,"height":.3}
    local=world_atlas(image_bytes(),box)
    generated=world_atlas(image_bytes(),box,use_model=True,provider=SimpleNamespace(generate_image_result=render))
    assert len(set(prompts))==5
    with Image.open(io.BytesIO(local)) as skin:
        assert skin.size==(128,128)
    with Image.open(io.BytesIO(generated)) as skin:
        assert skin.size==(512,512) and len(skin.crop((64,64,128,128)).getcolors())>1


def test_room_stream_project_and_public_activity(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHO_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(photo_worlds, "detect_local_faces", lambda *args: [])
    with TestClient(create_app()) as c:
        room = create_room(c)
        path = BASE + "/" + room["id"]
        member = "m" * 48
        assert claim(c, path, room["invite"], member, .45, "作者").status_code == 200
        screen = c.post(path + "/screen", headers=bearer(member)).json()["key"]
        with c.websocket_connect(path + "/stream") as stream:
            stream.send_text(screen)
            assert stream.receive_json() == {"type": "ready"}
            data = {"id":"project-0001","kind":"project","title":"我的作品","body":"私人展品原文","happened":"2026-08-04"}
            assert c.post(path + "/moments", headers=bearer(member), data=data).status_code == 201
            assert stream.receive_json() == {"type": "changed"}
        public = c.get(path + "/screen", headers=bearer(screen)).json()
        assert [event["kind"] for event in public["activity"]] == ["exhibited", "joined"]
        assert "私人展品原文" not in str(public)
        assert "我的作品" not in str(public)
        assert c.get(path, headers=bearer(room["invite"])).json()["activity"] == []


def test_ai_field_requires_both_people_and_keeps_only_current_sources(tmp_path,monkeypatch):
    from app.api import photo_world_field
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *args:[])
    calls=[]
    def design(provider,messages):
        calls.append(messages)
        return SimpleNamespace(mock=False,model="fixture",text='{"title":"两盏灯的工坊","parameters":{"sky":"#8da7a2"}}')
    monkeypatch.setattr(photo_world_field,"interactive_json_chat",design)
    with TestClient(create_app()) as c:
        room=create_room(c);route=BASE+"/"+room["id"];a,b="a"*48,"b"*48
        claim(c,route,room["invite"],a,.20,"名字甲")
        claim(c,route,room["invite"],b,.65,"名字乙")
        one,two=route+"/fields/1",route+"/fields/0"
        c.put(one+"/consent",headers=bearer(a),json={"consent":True})
        assert c.post(one+"/interpret",headers=bearer(a)).status_code==409 and not calls
        c.put(two+"/consent",headers=bearer(b),json={"consent":True})
        assert c.post(one+"/interpret",headers=bearer(a)).status_code==200
        assert c.get(two,headers=bearer(b)).json()["scene"]["title"]=="两盏灯的工坊"
        assert "名字甲" not in str(calls) and "名字乙" not in str(calls)
        c.put(route+"/people/1/impression",headers=bearer(a),json={"text":"一条新的观察"})
        assert c.get(one,headers=bearer(a)).json()["model"]=="relationship-field-rules.v1"
        c.put(two+"/consent",headers=bearer(b),json={"consent":False})
        assert c.post(one+"/interpret",headers=bearer(a)).status_code==409

def test_default_detector_finds_the_three_people_in_the_repository_sample():
    from pathlib import Path
    from app.pipelines.group_onboarding.local_faces import detect_local_faces
    photo = Path(__file__).resolve().parents[2] / "public" / "encounter" / "group.webp"
    boxes = detect_local_faces(photo.read_bytes())
    assert len(boxes) == 3
    for box, expected_x in zip(boxes, (.24, .5, .76)):
        assert box["x"] < expected_x < box["x"] + box["width"]


def test_account_library_requires_both_proofs_and_preserves_visitor_separation(tmp_path,monkeypatch):
    from app.security.meetmind_jwt import sign_echo_token
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setenv("JWT_SECRET","isolated-test-fixture-only")
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *args:[])
    with TestClient(create_app()) as c:
        room=create_room(c);route=BASE+"/"+room["id"];key="a"*48
        claim(c,route,room["invite"],key,.20,"小禾")
        token=sign_echo_token("fixture-account","测试用户")
        assert c.put(route+"/library",headers=bearer(token)).status_code==403
        assert c.put(route+"/library",headers={**bearer(token),"X-World-Seat":key}).status_code==200
        assert c.get(BASE+"/library/mine",headers=bearer(token)).json()["worlds"][0]["seat"]==0
        assert c.get(route,headers=bearer(token)).json()["me"]==0
        invite=c.post(route+"/invitations",headers=bearer(token)).json()["invite"]
        assert c.get(route,headers=bearer(invite)).json()["me"] is None
        assert claim(c,route,invite,"b"*48,.62,"乙").status_code==200
        c.delete(route+"/library",headers=bearer(token))
        assert c.get(route,headers=bearer(token)).status_code==404
        assert c.get(route,headers=bearer(key)).json()["me"]==0


def test_history_and_ring_view_remain_private_to_the_recorder(tmp_path,monkeypatch):
    from app.security.meetmind_jwt import sign_echo_token
    from app.signals import PersonSignalProjector
    monkeypatch.setenv("ECHO_DATA_DIR",str(tmp_path))
    monkeypatch.setenv("JWT_SECRET","isolated-test-fixture-only")
    monkeypatch.setattr(photo_worlds,"detect_local_faces",lambda *args:[])
    monkeypatch.setattr(PersonSignalProjector,"load",lambda self,pkg:{
        "capturedAt":"2026-08-04T09:00:00Z","heart":{"currentBpm":73},"sourceRefs":{"encounterId":"fixture-event"},
        "samples":[1,2,3]})
    with TestClient(create_app()) as c:
        room=create_room(c);route=BASE+"/"+room["id"]
        keys=["a"*48,"b"*48]
        for i,key in enumerate(keys):
            claim(c,route,room["invite"],key,.2+i*.45,"成员"+str(i))
        store=c.app.state.store
        pkg=store.create_draft_package("person_archived_fixture",{})
        pkg["owner_id"]="fixture-archivist";pkg["identity"].update({"confirmed":True,"name":"过去的现场"})
        store.save_package(pkg)
        headers={**bearer(sign_echo_token("fixture-archivist","记录人")),"X-World-Seat":keys[0]}
        other={**bearer(sign_echo_token("fixture-other","另一个账号")),"X-World-Seat":keys[1]}
        url=route+"/people/1/archive"
        assert c.get(url,headers=bearer(room["invite"])).status_code==401
        assert c.put(url,headers=other,json={"person_id":pkg["person_id"]}).status_code==404
        assert c.put(url,headers=headers,json={"person_id":pkg["person_id"]}).status_code==200
        data=c.get(url,headers=headers).json()
        assert data["signal"]["value"]==73 and data["signal"]["evidence"]=="fixture-event" and "samples" not in data["signal"]
        assert c.get(url,headers=other).json()=={"choices":[],"person":None,"signal":None}
        assert "过去的现场" not in str(c.get(route,headers=bearer(keys[1])).json())
        c.put(url,headers=headers,json={"person_id":None})
        assert c.get(url,headers=headers).json()["person"] is None
