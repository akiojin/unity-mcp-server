using DC = SomeNamespace.DiceController;

namespace TestScripts
{
    public class AliasUser
    {
        private DC _dc = new DC();
        public int Use() { _dc.Roll(); return _dc.Value; }
    }
}

